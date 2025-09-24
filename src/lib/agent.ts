/**
 * Agent functions for interacting with AI assistants
 */

import { exec, ExecException } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 执行codebuddy命令
 * @param query - 要执行的查询字符串
 * @returns Promise that resolves to the command output
 */
export async function codebuddy(query: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(
      `codebuddy -p --dangerously-skip-permissions "${query.replace(/"/g, '\\"')}"`,
      {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      }
    );
    return stdout || stderr;
  } catch (error) {
    const err = error as ExecException;
    return err.stdout || err.stderr || err.message || 'Unknown error occurred';
  }
}

/**
 * 检查codebuddy命令是否存在且可执行
 */
export async function isCodebuddyExists() {
  try {
    // 尝试获取codebuddy版本信息
    const { stdout } = await execAsync('codebuddy --version', {
      encoding: 'utf8',
      timeout: 5000, // 5秒超时
    });
    // 检查是否返回了版本号
    return stdout.trim().length > 0 && /^\d+\.\d+\.\d+/.test(stdout.trim());
  } catch (error) {
    return false;
  }
}

/**
 * 检查codebuddy登录状态
 */
export async function isLoginCodebuddy(): Promise<boolean> {
  // 首先检查命令是否存在
  const existsCheck = await isCodebuddyExists();
  if (!existsCheck) {
    return false;
  }
  const loginRequiredPatterns = [
    'authentication required',
    'please use /login command',
    'sign in to your account',
    'login required',
    'not logged in',
    'authentication failed',
    'unauthorized',
  ];
  try {
    // 尝试执行一个简单的测试命令来检查登录状态
    const { stdout, stderr } = await execAsync(
      'codebuddy -p --dangerously-skip-permissions "test"',
      {
        encoding: 'utf8',
        timeout: 10000, // 10秒超时
      }
    );
    const output = (stdout || stderr || '').toLowerCase();
    return !loginRequiredPatterns.some(pattern => output.includes(pattern));
  } catch (error) {
    return false;
  }
}
