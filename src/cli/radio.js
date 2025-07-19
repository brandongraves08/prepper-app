const { spawn } = require('child_process');
const path = require('path');

/**
 * Wrapper to interact with the SDR bridge Python script.
 */
function runBridge(args = []) {
  return new Promise((resolve) => {
    const python = process.env.PYTHON || 'python3';
    const script = path.join(__dirname, '..', 'sdr', 'bridge.py');
    const proc = spawn(python, [script, ...args], { stdio: 'inherit' });
    proc.on('exit', (code) => resolve(code ?? 0));
  });
}

async function handleRadioCommand(options, command) {
  if (command === 'send') {
    if (!options.message) {
      console.error('Please provide a message with --message');
      return;
    }
    await runBridge(['send', options.message]);
  } else if (command === 'listen') {
    await runBridge(['listen']);
  } else {
    console.log('Unknown command. Use send or listen.');
  }
}

module.exports = { handleRadioCommand };
