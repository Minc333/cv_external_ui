const {Command} = require('commander');
const chalk = require('chalk');
const packageJson = require('./package.json');
const path = require('path');
const fs = require('fs-extra');
const spawn = require('cross-spawn');

async function init() {
    let projectName;
    new Command(packageJson.name) //项目名
        .version(packageJson.version)  //版本号 
        .arguments('<project-directory>') //项目的目录名
        .usage(`${chalk.green('<project-directory>')}`)
        .action((name)=> {
            projectName = name;
        }).parse(process.argv) //[node完整路径，当前node脚本的路径，……，其他参数]
        await createApp(projectName);
}

async function createApp(appName){
    let root = path.resolve(appName);  //得到将要生成项目的绝对路径
    fs.ensureDirSync(appName);         //保证此目录是存在的，如果不存在，则创建
    console.log(`Creating a new React app in ${chalk.green(root)}.`);
    console.log(); 

    const packageJson = {
        name: appName,
        version: '0.1.0',
        private: true,
      };
      fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      const originalDirectory = process.cwd(); //原始的命令工作目录
      process.chdir(root); //改变工作目录
      console.log('appName', appName);
      console.log('root', root);
      console.log('originalDirectory', originalDirectory);
      await run(root, appName, originalDirectory);

}

/**
 * @param {*} root 创建项目名的路径
 * @param {*} appName 项目名
 * @param {*} originalDirectory 原来的工作目录 
 */
async function run(root, appName, originalDirectory) {
    let scriptName = 'react-scripts';  //create生成的代码里，源文件编译，启动服务都放在了里面
    let templateName = 'cra-template';
    const allDependencies = ['react', 'react-dom', scriptName, templateName];
    console.log('Installing packages. This might take a couple of minutes.');
    console.log('');
    console.log(
        `Installing ${chalk.cyan('react')}, ${chalk.cyan(
          'react-dom'
        )}, and ${chalk.cyan(scriptName)}${ `with ${chalk.cyan(templateName)}` }...`
    );
    console.log();
    await install(root, allDependencies);
    //项目根目录， 项目名， verbose是否显示详细安装信息， 原始的目录， 模板名
    let data = [root, appName, true, originalDirectory, templateName];
    let source = `
    var init = require('react-scripts/scripts/init.js');
    init.apply(null, JSON.parse(process.argv[1]));
    `;
    await executeNodeScript({cwd:process.cwd()}, data, source);
    console.log('Done');
    process.exit(0);
    
}

async function executeNodeScript({cwd}, data, source) {
    return new Promise((resolve)=> {
        const child = spawn(
            process.execPath,
            ['-e', source, '--', JSON.stringify(data)],
            {cwd, stdio:'inherit'}
        );
        child.on('close', resolve);
    })

}

async function install(root, allDependencies) {
    return new Promise(resolve=>{
        const command = 'yarnpkg';
        const args = ['add', '--exact', ...allDependencies, '--cwd', root];
        console.log(command, args);
        const child = spawn(command, args, {stdio: 'inherit'});
        child.on('close', resolve);
    })
}

module.exports = {
    init
}