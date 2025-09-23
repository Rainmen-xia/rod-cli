/**
 * Template Generation Utilities
 *
 * Common utility functions shared across template generators
 */

import { AIAssistant, ScriptType } from '../../types/cli-config';

/**
 * Generate roadmap workflow files
 */
export async function generateRoadmapWorkflow(
  projectPath: string,
  projectName: string,
  templateBasePath: string,
  filesCreated: string[]
): Promise<void> {
  const { promises: fs } = await import('fs');
  const path = await import('path');

  const specsDir = path.join(projectPath, 'specs');
  await fs.mkdir(specsDir, { recursive: true });

  // Create initial roadmap from template
  const roadmapSourcePath = path.join(templateBasePath, 'roadmap-template.md');
  const roadmapDestPath = path.join(specsDir, 'roadmap.md');

  try {
    let roadmapContent = await fs.readFile(roadmapSourcePath, 'utf8');

    // Replace project name placeholder
    roadmapContent = roadmapContent.replace(/\[项目名称\]/g, projectName);
    roadmapContent = roadmapContent.replace(/\[Project Name\]/g, projectName);

    // Add creation timestamp
    const now = new Date().toISOString().split('T')[0];
    roadmapContent = roadmapContent.replace(/\[创建时间\]/g, now);
    roadmapContent = roadmapContent.replace(/\[Creation Date\]/g, now);

    await fs.writeFile(roadmapDestPath, roadmapContent, 'utf8');
    filesCreated.push(roadmapDestPath);
  } catch (error) {
    throw new Error(`Failed to generate roadmap: ${(error as Error).message}`);
  }

  // Create modules directory structure
  const modulesDir = path.join(specsDir, 'modules');
  await fs.mkdir(modulesDir, { recursive: true });
  filesCreated.push(modulesDir);

  // Create README for modules directory
  const modulesReadmeContent = `# 模块目录

此目录包含项目的各个模块规范。每个模块应包含以下文件：

- \`spec.md\` - 规格说明
- \`plan.md\` - 设计文档
- \`tasks.md\` - 任务清单

## 模块结构

模块可以是递归的，即模块内可以包含子模块，通过 \`modules/\` 子目录实现。

## 使用说明

1. 使用 \`/module <模块名>\` 创建新模块
2. 使用 \`/specify\` 分析规格
3. 使用 \`/plan\` 生成设计文档
4. 使用 \`/tasks\` 创建任务清单
5. 使用 \`/progress\` 同步进度到roadmap
`;

  const modulesReadmePath = path.join(modulesDir, 'README.md');
  await fs.writeFile(modulesReadmePath, modulesReadmeContent, 'utf8');
  filesCreated.push(modulesReadmePath);
}

/**
 * Calculate total size of created files
 */
export async function calculateTotalSize(filesCreated: string[]): Promise<{ totalSize: number; warnings: string[] }> {
  const { promises: fs } = await import('fs');

  let totalSize = 0;
  const warnings: string[] = [];

  for (const filePath of filesCreated) {
    try {
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    } catch (error) {
      // File might not exist if generation failed
      warnings.push(`Could not stat file: ${filePath}`);
    }
  }

  return { totalSize, warnings };
}

/**
 * Validate template generation configuration
 */
export function validateConfig(config: {
  aiAssistant: AIAssistant;
  scriptType: ScriptType;
  projectPath: string;
  projectName: string;
  templateName?: string;
}): void {
  if (!config.aiAssistant) {
    throw new Error('AI assistant is required');
  }

  if (!config.scriptType) {
    throw new Error('Script type is required');
  }

  if (!config.projectPath) {
    throw new Error('Project path is required');
  }

  if (!config.projectName) {
    throw new Error('Project name is required');
  }

  // Validate enum values
  if (!Object.values(AIAssistant).includes(config.aiAssistant)) {
    throw new Error(`Invalid AI assistant: ${config.aiAssistant}`);
  }

  if (!Object.values(ScriptType).includes(config.scriptType)) {
    throw new Error(`Invalid script type: ${config.scriptType}`);
  }
}