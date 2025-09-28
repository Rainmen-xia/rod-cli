/**
 * Agent functions for interacting with AI assistants
 */

import { exec, ExecException } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Codebuddy执行结果接口
 */
export interface CodebuddyResult {
  success: boolean;
  message: string;
}

enum CodebuddyErrorType {
  SUCCESS = 'SUCCESS',
  COMMAND_NOT_FOUND = 'COMMAND_NOT_FOUND',
  LOGIN_REQUIRED = 'LOGIN_REQUIRED',
}

/**
 * 检查命令输出是否正常
 * @param output - 命令输出内容
 * @returns 是否为正常输出
 */
function isValidCodebuddyOutput(output: string): {
  isValid: boolean;
  errorType: CodebuddyErrorType;
} {
  const lowerOutput = output.toLowerCase();

  // 检查命令不存在的模式
  const commandNotFoundPatterns = [
    'command not found',
    'codebuddy: not found',
    'no such file or directory',
    'is not recognized as an internal or external command',
    'codebuddy命令不存在',
  ];

  // 检查需要登录的模式
  const loginRequiredPatterns = [
    'authentication required',
    'please use /login command',
    'sign in to your account',
    'login required',
    'not logged in',
    'authentication failed',
    'unauthorized',
    '请登录',
  ];

  // 检查是否是命令不存在错误
  if (commandNotFoundPatterns.some(pattern => lowerOutput.includes(pattern))) {
    return { isValid: false, errorType: CodebuddyErrorType.COMMAND_NOT_FOUND };
  }

  // 检查是否是登录相关错误
  if (loginRequiredPatterns.some(pattern => lowerOutput.includes(pattern))) {
    return { isValid: false, errorType: CodebuddyErrorType.LOGIN_REQUIRED };
  }

  return { isValid: true, errorType: CodebuddyErrorType.SUCCESS };
}

/**
 * 执行codebuddy命令
 * @param query - 要执行的查询字符串
 * @returns Promise that resolves to CodebuddyResult
 */
export async function codebuddy(query: string): Promise<CodebuddyResult> {
  let success = true;
  let output = '';
  try {
    const { stdout, stderr } = await execAsync(
      `codebuddy -p --dangerously-skip-permissions "${query.replace(/"/g, '\\"')}"`,
      {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      }
    );
    output = stdout || stderr || '';
  } catch (error) {
    const err = error as ExecException;
    output =
      err.stdout || err.stderr || err.message || 'Unknown error occurred';
    success = false; // catch 时，success 为 false
  }
  console.log(`🚀 ~ codebuddy ~ success: ${success} ~ output:`, output);
  const validation = isValidCodebuddyOutput(output);
  if (!validation.isValid) {
    return {
      success: false,
      message: validation.errorType,
    };
  }
  return {
    success,
    message: output,
  };
}
