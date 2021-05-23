const {Command} = require('commander');
const chalk = require('chalk');
const packageJson = require('./package.json');
const path = require('path');
const fs = require('fs-extra');
const spawn = require('cross-spawn');

async function init() {
    let projectName;
    let projectTemplate;
    new Command(packageJson.name) //项目名
        .version(packageJson.version)  //版本号 
        .arguments('<project-directory> <project-template>') //项目的目录名
        .usage(`${chalk.green('<project-directory>')} ${chalk.green('<project-template>')}`)
        .action((name, template)=> {
            projectName = name;
            projectTemplate = template;
        })
        .parse(process.argv) //[node完整路径，当前node脚本的路径，……，其他参数]
    await createApp(projectName, projectTemplate);
}

async function createApp(appName, template){
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
      await run(root, appName, originalDirectory, template);
}

/**
 * @param {*} root 创建项目名的路径
 * @param {*} appName 项目名
 * @param {*} originalDirectory 原来的工作目录 
 */
async function run(root, appName, originalDirectory, template) {
    let scriptName = 'react-scripts';  //create生成的代码里，源文件编译，启动服务都放在了里面
    Promise.all([
        getTemplateInstallPackage(template, originalDirectory),
      ]).then(([templateToInstall]) => { 
        const allDependencies = ['react', 'react-dom', scriptName, templateToInstall];

        console.log('Installing packages. This might take a couple of minutes.');

        Promise.all([
            getPackageInfo(templateToInstall),
          ])
            .then(([templateInfo]) => {
                console.log('');
                console.log(
                    `Installing ${chalk.cyan('react')}, ${chalk.cyan(
                      'react-dom'
                    )}, and ${chalk.cyan(scriptName)}${ ` with ${chalk.cyan(templateInfo.name)}` }...`
                );
                console.log();
                return install(root, allDependencies).then(() => ({templateInfo}));
            })
            .then(async ({templateInfo}) => {
                const templateName = templateInfo.name;
                let data = [root, appName, true, originalDirectory, templateName];
                let source = `
                var init = require('react-scripts/scripts/init.js');
                init.apply(null, JSON.parse(process.argv[1]));
                `;
                await executeNodeScript({cwd:process.cwd()}, data, source);
                console.log('Done');
                process.exit(0);
          })    
      })
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

function install(root, allDependencies) {
    return new Promise(resolve=>{
        const command = 'yarnpkg';
        const args = ['add', '--exact', ...allDependencies, '--cwd', root];
        console.log(command, args);
        const child = spawn(command, args, {stdio: 'inherit'});
        child.on('close', resolve);
    })
}

function getTemplateInstallPackage(template, originalDirectory) {
    let templateToInstall = 'cra-template';
    if (template) {
      if (template.match(/^file:/)) {
        templateToInstall = `file:${path.resolve(
          originalDirectory,
          template.match(/^file:(.*)?$/)[1]
        )}`;
      }
    }
    return Promise.resolve(templateToInstall);
}

function getPackageInfo(installPackage) {
   if (installPackage.match(/^file:/)) {
      const installPackagePath = installPackage.match(/^file:(.*)?$/)[1];
      const { name, version } = require(path.join(
        installPackagePath,
        'package.json'
      ));
      return Promise.resolve({ name, version });
    }
    return Promise.resolve({ name: installPackage });
  }

module.exports = {
    init
}