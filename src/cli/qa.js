const { OpenAI } = require('openai');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Initialize OpenAI client if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Check if vLLM server is available
 * @returns {Promise<boolean>} Whether vLLM server is available
 */
async function isVLLMAvailable() {
  try {
    const vllmUrl = process.env.VLLM_SERVER_URL || 'http://localhost:8001';
    const response = await axios.get(`${vllmUrl}/health`, { timeout: 5000 });
    return response.data && response.data.status === 'ok' && response.data.model_loaded;
  } catch (error) {
    console.log(`vLLM server check failed: ${error.message}`);
    return false;
  }
}

/**
 * Ask a question to the local vLLM server
 * @param {string} question The question to ask
 * @returns {Promise<string>} The answer from the local model
 */
async function askLocalLLM(question) {
  try {
    console.log('Using local vLLM server...');
    
    const cacheDir = path.join(__dirname, '..', '..', 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
    
    const questionHash = Buffer.from(question).toString('base64').substring(0, 10);
    const cachePath = path.join(cacheDir, `${questionHash}.txt`);
    
    if (process.env.ENABLE_CACHE !== 'false') {
      try {
        const cachedResponse = await fs.readFile(cachePath, 'utf-8');
        console.log('Found cached response');
        return cachedResponse;
      } catch (err) {
        // No cached response, continue
      }
    }
    
    const vllmUrl = process.env.VLLM_SERVER_URL || 'http://localhost:8001';
    const response = await axios.post(`${vllmUrl}/generate`, {
      prompt: question,
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95
    });
    
    const answer = response.data.response;

    if (process.env.ENABLE_CACHE !== 'false') {
      await fs.writeFile(cachePath, answer, 'utf-8');
      console.log('Saved local LLM response to cache');
    }
    
    return answer;
  } catch (error) {
    throw new Error(`Local LLM error: ${error.message}`);
  }
}

/**
 * Ask a question to OpenAI
 * @param {string} question The question to ask
 * @returns {Promise<string>} The answer from OpenAI
 */
async function askOpenAI(question) {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in your .env file.');
  }
  
  console.log('Using OpenAI...');
  
  try {
    const cacheDir = path.join(__dirname, '..', '..', 'cache');
    await fs.mkdir(cacheDir, { recursive: true });
    
    const questionHash = Buffer.from(question).toString('base64').substring(0, 10);
    const cachePath = path.join(cacheDir, `${questionHash}.txt`);

    if (process.env.ENABLE_CACHE !== 'false') {
      try {
        const cachedResponse = await fs.readFile(cachePath, 'utf-8');
        console.log('Found cached OpenAI response');
        return cachedResponse;
      } catch (err) {
        // No cached response, continue to call OpenAI
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful emergency preparedness assistant. Provide concise, practical advice for preppers." },
        { role: "user", content: question }
      ],
      max_tokens: 500
    });
    
    const answer = completion.choices[0].message.content;

    if (process.env.ENABLE_CACHE !== 'false') {
      await fs.writeFile(cachePath, answer, 'utf-8');
      console.log('Saved OpenAI response to cache');
    }

    return answer;
  } catch (error) {
    throw new Error(`OpenAI error: ${error.message}`);
  }
}

/**
 * Ask a question to either local LLM or OpenAI based on availability and options
 * @param {string} question The question to ask
 * @param {Object} options Command options
 * @returns {Promise<string>} The answer
 */
async function askQuestion(question, options = {}) {
  console.log(`Question: ${question}`);
  
  const vllmAvailable = await isVLLMAvailable();
  
  // Determine which model to use based on options and availability
  if (options.online && openai) {
    return askOpenAI(question);
  } else if (options.local || !openai) {
    if (vllmAvailable) {
      return askLocalLLM(question);
    } else {
      throw new Error('Local LLM not available and online mode not specified or OpenAI key not configured');
    }
  } else {
    // Try local first, fall back to online
    try {
      if (vllmAvailable) {
        return await askLocalLLM(question);
      } else {
        console.log('Local LLM not available, falling back to OpenAI');
        return await askOpenAI(question);
      }
    } catch (error) {
      if (openai) {
        console.log(`Local LLM failed: ${error.message}`);
        console.log('Falling back to OpenAI...');
        return await askOpenAI(question);
      } else {
        throw error;
      }
    }
  }
}

module.exports = {
  askQuestion
};
