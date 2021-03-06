const Task             = require('./-task');
const CreateCordova    = require('../targets/cordova/tasks/create-project');
const UpdateGitIgnore  = require('../tasks/update-gitignore');
const InstallPackage   = require('../tasks/install-package');
const camelize         = require('../utils/string').camelize;
const path             = require('path');
const Promise          = require('rsvp').Promise;
const fsUtils          = require('../utils/fs-utils');
const frameworkType    = require('../utils/framework-type');
const requireFramework = require('../utils/require-framework');
const logger           = require('../utils/logger');
const chalk            = require('chalk');

const createProjectId = function(projectName) {
  return 'io.corber.' + projectName;
};

module.exports = Task.extend({
  project: undefined,
  ui: undefined,
  cordovaId: undefined,
  name: undefined,
  templatePath: '',

  initDirs(project) {
    let emberCdvPath = path.join(project.root, 'corber');
    let framework = frameworkType.get(project.root);

    if (framework === 'custom') {
      this.warnCustomFramework();
    }

    let configPath = path.join(
      __dirname,
      '../templates/frameworks',
      `${framework}.js`
    );

    fsUtils.mkdir(emberCdvPath);
    fsUtils.mkdir(path.join(emberCdvPath, 'config'));

    fsUtils.copy(
      configPath,
      path.resolve(emberCdvPath, 'config/framework.js')
    );

    if (framework === 'vue') {
      this.warnVueEngine();
    }

    return Promise.resolve();
  },

  warnCustomFramework() {
    logger.warn(`
      Your framework type (Ember/Vue/Glimmer was not identified.
      Initting with a custom framework type.
      Required framework functions are in corber/config/framework.js
      - You will need to implement these shell functions yourself.
      \n
      If you expected a framework type to be identified, please open an issue`
    );
  },

  warnVueEngine() {
    logger.info(chalk.red((`WARNING VUE USER:
      Unfortunately vue-cli defaults your package.json engines to npm >3

      cordova-lib has a hard dependency in the npm 2.x series

      For now, you need to edit your package.json engines and change:
      "engines": {
        "npm": ">= 3.0.0" to >= 2.0.0
      }

      This will not affect your broader Vue experience.`
    )));
  },

  run() {
    let projectName = camelize(this.project.name());

    let create = new CreateCordova({
      id: this.cordovaid || createProjectId(projectName),
      name: this.name || projectName,
      templatePath: this.templatePath,
      project: this.project,
      ui: this.ui
    });

    let updateGitIgnore = new UpdateGitIgnore({
      project: this.project,
      ui: this.ui
    });

    let installPackage = new InstallPackage({
      project: this.project,
      ui: this.ui
    });

    return this.initDirs(this.project)
    .then(() => create.run())
    .then(() => updateGitIgnore.run())
    .then(() => installPackage.run())
    .then(() => {
      let framework = requireFramework(this.project);
      framework.afterInstall();
    })
  }
});
