/**
 * 使用koa启动agent服务
 */

import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import chalk from 'chalk';
import { Server } from 'http';
import { codebuddy } from '../lib/agent';
import { ExitCode } from '../contracts/cli-interface';

export interface StartServerArgs {
  port: number;
}

// 跟踪服务器状态
let serverInstance: Server | null = null;
let serverPort: number | undefined = undefined;

const app = new Koa();
const router = new Router();
app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: '*',
  })
);
app.use(
  bodyParser({
    jsonLimit: '10mb',
  })
);
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const error = err as Error;
    console.error(chalk.red('Server error:'), error.message);
    ctx.status = 500;
    ctx.body = {
      error: 'Internal Server Error',
      message: error.message,
    };
  }
});

router.post('/runCommand', async ctx => {
  const { query } = ctx.request.body as { query?: string };

  if (!query || typeof query !== 'string') {
    ctx.status = 400;
    ctx.body = {
      error: 'Bad Request',
      message: 'Query parameter is required and must be a string',
    };
    return;
  }

  try {
    const result = await codebuddy(query);
    ctx.body = {
      code: result.success ? 0 : 1,
      message: result.message,
    };
  } catch (error) {
    const err = error as Error;
    ctx.status = 500;
    ctx.body = {
      code: 1,
      message: err.message,
    };
  }
});

// Apply routes
app.use(router.routes());
app.use(router.allowedMethods());

export const executeStartServerCommand = (args: StartServerArgs) => {
  const { port } = args;
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(
      chalk.red('Invalid port number. Port must be between 1 and 65535.')
    );
    process.exit(ExitCode.INVALID_ARGS);
  }
  // 检查服务器是否已经在运行
  if (serverInstance) {
    console.log(
      chalk.yellow(
        `⚠️  Server is already running on http://localhost:${serverPort}`
      )
    );
    return;
  }

  const server = app.listen(port, () => {
    console.log(chalk.green(`🚀 ROD Agent Server started successfully!`));
    console.log(chalk.blue(`   Server running on http://localhost:${port}`));
    console.log(
      chalk.blue(`   API endpoint: http://localhost:${port}/runCommand`)
    );
    console.log(chalk.gray(`   Press Ctrl+C to stop the server`));
  });

  // 更新服务器状态
  serverInstance = server;
  serverPort = port;

  // Graceful shutdown
  const handleShutdown = () => {
    if (serverInstance) {
      console.log(chalk.yellow('\n🔄 Shutting down server gracefully...'));
      serverInstance.close(() => {
        console.log(chalk.green('✅ Server stopped successfully'));
        serverInstance = null;
        serverPort = undefined;
        process.exit(ExitCode.SUCCESS);
      });
    }
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
};
