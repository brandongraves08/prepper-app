#!/usr/bin/env node
require('dotenv').config();
const { Command } = require('commander');
const { askQuestion } = require('./qa');
const { getSupplyInfo } = require('./supplies');
const { handleFoodItemCommand } = require('./foodItems');
const { handleMeshCommand, printHelp } = require('./mesh');
const { handleRadioCommand } = require('./radio');

const program = new Command();

program
  .name('prepper-cli')
  .description('Prepper App CLI - Emergency Preparedness Assistant')
  .version('0.1.0');

program
  .command('ask')
  .description('Ask a question to the local LLM or OpenAI fallback')
  .argument('<question>', 'The question to ask')
  .option('-o, --online', 'Force using online OpenAI API')
  .option('-l, --local', 'Force using local vLLM only')
  .action(async (question, options) => {
    try {
      const answer = await askQuestion(question, options);
      console.log('\nAnswer:');
      console.log(answer);
    } catch (error) {
      console.error('Error:', error.message);
    }
  });

program
  .command('supplies')
  .description('Get information about your current supplies')
  .option('-d, --days', 'Show estimated days of food left')
  .option('-f, --food', 'List all food items')
  .option('-p, --people', 'List all people')
  .action(async (options) => {
    try {
      await getSupplyInfo(options);
    } catch (error) {
      console.error('Error:', error.message);
    }
  });

program
  .command('food')
  .description('Manage food inventory')
  .argument('<command>', 'Command to execute: add, update, delete')
  .option('-i, --id <id>', 'Food item ID (for update/delete)')
  .option('-n, --name <name>', 'Food item name')
  .option('-q, --quantity <quantity>', 'Quantity of the item')
  .option('-u, --unit <unit>', 'Unit of measurement (e.g., cans, kg)')
  .option('-c, --calories <calories>', 'Calories per unit')
  .option('-e, --expiry <date>', 'Expiry date (YYYY-MM-DD)')
  .action(async (command, options) => {
    try {
      await handleFoodItemCommand(options, command);
    } catch (error) {
      console.error('Error:', error.message);
    }
  });

program
  .command('mesh')
  .description('Manage mesh network for peer-to-peer sync')
  .argument('<command>', 'Command to execute: start, status, sync, stop')
  .option('-p, --port <port>', 'Port to listen on (for start command)')
  .action(async (command, options) => {
    try {
      await handleMeshCommand(options, command);
    } catch (error) {
      console.error('Error:', error.message);
      if (command === 'start') {
        console.log('\nFor more information, use: prepper mesh --help');
      }
    }
  });

program
  .command('radio')
  .description('Send or receive bulletins via SDR')
  .argument('<command>', 'Command to execute: send or listen')
  .option('-m, --message <text>', 'Message to send when using send command')
  .action(async (command, options) => {
    try {
      await handleRadioCommand(options, command);
    } catch (error) {
      console.error('Error:', error.message);
    }
  });

program.parse();
