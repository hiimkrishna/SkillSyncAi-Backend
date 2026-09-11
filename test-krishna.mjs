import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const secret = process.env.JWT_SECRET;
const userId = '00f4d938-6e89-4207-93fa-52abbc4a3dd2';
const token = jwt.sign({ userId, role: 'candidate', approvalStatus: 'approved' }, secret, { expiresIn: '1h' });
console.log(token);
const res = await fetch('http://localhost:5000/api/ai/resume/analysis', { headers: { Authorization: `Bearer ${token}` }});
console.log(await res.text());
