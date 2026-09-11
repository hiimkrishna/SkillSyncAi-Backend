import { getResumeAnalysis } from './src/modules/ai/ai.service.js';
const userId = '00f4d938-6e89-4207-93fa-52abbc4a3dd2';
const res = await getResumeAnalysis(userId, null);
console.log(JSON.stringify(res, null, 2));
