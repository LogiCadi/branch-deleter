const { execSync } = require("child_process");
const moment = require("moment");
const chalk = require("chalk");
const prompts = require("prompts");

(async () => {
  const options = await prompts([
    {
      type: "number",
      name: "date",
      message: `delete branches from months ago`,
      initial: 12,
    },
    {
      type: "text",
      name: "include",
      message: `branches containing this name will be deleted, eg: fix`,
    },
    {
      type: "text",
      name: "exclude",
      message: `branches containing this name will not be deleted, eg: release`,
    },
  ]);

  // get all branches in chronological order
  let branches = execSync(
    `git branch -a --sort committerdate --format "%(committerdate:short) %(refname:short)"`
  )
    .toString()
    .split("\n");

  // filter out the branches that need to be deleted
  branches = branches.reduce((res, branch) => {
    if (!branch) return res;
    const date = branch.split(" ")[0];
    const name = branch.split(" ")[1];

    let pass =
      moment().subtract(options.date, "month").valueOf() >
      moment(date).valueOf();

    if (options.include && pass) {
      pass = name.indexOf(options.include) !== -1;
    }

    if (options.exclude && pass) {
      pass = name.indexOf(options.exclude) === -1;
    }

    if (pass) {
      return [...res, name];
    } else {
      return res;
    }
  }, []);

  if (!branches.length) {
    return console.log(chalk.yellow("no branches need to be deleted"));
  }

  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: `please confirm deleting the following ${chalk.blue(
      branches.length
    )} branches:\n${chalk.blue(branches.join("\n"))}\n`,
  });

  if (!confirm) return;

  // delete
  branches.forEach((branch) => {
    try {
      console.log(`\ndelete: ${chalk.blue(branch)}`);

      if (branch.indexOf("origin/") === -1) {
        // local
        execSync(`git branch -D ${branch}`);
      } else {
        // remote
        execSync(`git push origin --delete ${branch.replace("origin/", "")}`);
      }

      console.log(chalk.green(`SUCCESS: ${chalk.blue(branch)}`));
    } catch (error) {
      console.log(chalk.red(`ERROR: ${error}`));
    }
  });
})();
