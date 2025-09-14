import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Free Judge0 CE API configuration (no API key required)
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const FREE_JUDGE0_URL = 'https://ce.judge0.com';

// Language ID mapping for Judge0
const LANGUAGE_IDS = {
  'javascript': 63,  // Node.js
  'python': 71,      // Python 3
  'cpp': 54,         // C++ (GCC 9.2.0)
  'c': 50,           // C (GCC 9.2.0)
  'java': 62,        // Java (OpenJDK 13.0.1)
  'csharp': 51,      // C# (Mono 6.6.0.161)
  'go': 60,          // Go (1.13.5)
  'rust': 73,        // Rust (1.40.0)
  'php': 68,         // PHP (7.4.1)
  'ruby': 72,        // Ruby (2.7.0)
  'swift': 83,       // Swift (5.2.3)
  'kotlin': 78,      // Kotlin (1.3.70)
  'typescript': 74   // TypeScript (3.7.4)
};

async function executeWithJudge0(code, languageId, stdin = '') {
  const apiKey = process.env.JUDGE0_API_KEY;

  // Try RapidAPI first if key is available, otherwise use free instance
  const useRapidAPI = apiKey && apiKey !== 'your-rapidapi-key-here';
  const baseUrl = useRapidAPI ? JUDGE0_API_URL : FREE_JUDGE0_URL;

  try {
    // Submit code for execution
    const submitHeaders = {
      'Content-Type': 'application/json'
    };

    if (useRapidAPI) {
      submitHeaders['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
      submitHeaders['X-RapidAPI-Key'] = apiKey;
    }

    const submitResponse = await fetch(`${baseUrl}/submissions?base64_encoded=true&wait=false`, {
      method: 'POST',
      headers: submitHeaders,
      body: JSON.stringify({
        language_id: languageId,
        source_code: Buffer.from(code).toString('base64'),
        stdin: Buffer.from(stdin).toString('base64')
      })
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Judge0 submission failed: ${submitResponse.status} - ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    const token = submitResult.token;

    // Poll for result
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const resultHeaders = {};
      if (useRapidAPI) {
        resultHeaders['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
        resultHeaders['X-RapidAPI-Key'] = apiKey;
      }

      const resultResponse = await fetch(`${baseUrl}/submissions/${token}?base64_encoded=true`, {
        headers: resultHeaders
      });

      if (!resultResponse.ok) {
        throw new Error(`Judge0 result fetch failed: ${resultResponse.status}`);
      }

      const result = await resultResponse.json();

      // Check if execution is complete
      if (result.status.id <= 2) { // In Queue or Processing
        attempts++;
        continue;
      }

      // Execution completed
      const output = result.stdout ? Buffer.from(result.stdout, 'base64').toString() : '';
      const error = result.stderr ? Buffer.from(result.stderr, 'base64').toString() : '';
      const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString() : '';

      if (result.status.id === 3) { // Accepted
        return { success: true, output: output.trim() };
      } else {
        // Error occurred
        const errorMessage = error || compileOutput || result.status.description || 'Unknown error';
        return { success: false, error: errorMessage };
      }
    }

    throw new Error('Execution timeout - code took too long to execute');

  } catch (error) {
    console.error('Judge0 API error:', error);
    throw error;
  }
}

router.post("/", authMiddleware, async (req, res) => {
  const { code, language, input = '' } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      message: "Code and language are required"
    });
  }

  console.log('Received execution request:', { language, codeLength: code.length });

  try {
    const languageId = LANGUAGE_IDS[language.toLowerCase()];

    if (!languageId) {
      return res.status(400).json({
        message: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_IDS).join(', ')}`
      });
    }

    const result = await executeWithJudge0(code, languageId, input);

    if (result.success) {
      console.log('Execution successful:', { language, output: result.output });
      res.json({ output: result.output });
    } else {
      console.log('Execution failed:', { language, error: result.error });
      res.status(400).json({
        message: 'Code execution failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      message: error.message || 'Code execution service unavailable',
      error: error.stack
    });
  }
});

export default router;