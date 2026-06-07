export const MockWhisperAI = {
    transcribe: async (s3Url: string): Promise<string> => {
      console.log(`[Whisper AI] Downloading and processing ${s3Url}...`);
      
      // Simulate a 2-second processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      if (s3Url.includes('corrupt')) {
        throw new Error('UNRECOVERABLE: Audio format not recognized. Cannot transcribe.');
      }
      if (s3Url.includes('timeout')) {
        throw new Error('TIMEOUT: GPU cluster unreachable.');
      }
  
      return "This is the generated meeting transcript...";
    }
  };