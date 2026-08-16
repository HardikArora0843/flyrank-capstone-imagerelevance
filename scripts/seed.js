const { spawn } = require('child_process');

const STEPS = [
  {
    name: 'seed:images',
    script: 'scripts/seedImages.js'
  },
  {
    name: 'seed:posts',
    script: 'scripts/seedPosts.js'
  },
  {
    name: 'seed:evaluation',
    script: 'scripts/seedEvaluation.js'
  }
];

function runStep(step) {
  return new Promise((resolve, reject) => {
    console.log(`\n========================================`);
    console.log(`Running ${step.name}`);
    console.log(`========================================\n`);

    const child = spawn(process.execPath, [step.script], {
      stdio: 'inherit',
      shell: false
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`${step.name} failed with exit code ${code}`)
        );
      }
    });
  });
}

async function main() {
  try {
    for (const step of STEPS) {
      await runStep(step);
    }

    console.log('\n========================================');
    console.log('Demo seed completed successfully');
    console.log('========================================\n');
  } catch (error) {
    console.error(`\nSeed failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

main();