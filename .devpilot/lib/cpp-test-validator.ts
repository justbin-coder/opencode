/**
 * cpp-test-validator.ts
 *
 * C++ 单元测试代码质量静态验证工具
 *
 * 用途：验证生成的 gtest/CppUnit 测试代码质量
 * 检查项：
 *   - 空断言（无实际检查逻辑）
 *   - 场景覆盖（三类场景标记）
 *   - 中文注释规范（[场景标记] 格式）
 *   - 断言清晰度（是否有具体的期望值）
 *   - Mock 使用规范
 *
 * 输出：JSON 格式的验证报告
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 类型定义
// ============================================================================

interface ValidationIssue {
  line: number;
  type: 'error' | 'warning';
  category: string;
  message: string;
  code: string;
  suggestion?: string;
}

interface TestScenario {
  name: string;
  startLine: number;
  endLine: number;
  scenarioType: 'normal' | 'boundary' | 'exception' | 'unknown';
  assertions: string[];
  hasMock: boolean;
  hasChineseComment: boolean;
  mockCount: number;
}

interface ValidationReport {
  file: string;
  totalLines: number;
  testCount: number;
  scenarioCoverage: {
    normal: number;
    boundary: number;
    exception: number;
    unknown: number;
  };
  issues: ValidationIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    emptyAssertions: number;
    scenarioCoverage: number;
    overallScore: number;
  };
  timestamp: string;
}

// ============================================================================
// 主验证类
// ============================================================================

class CppTestValidator {
  private filePath: string;
  private content: string;
  private lines: string[];
  private issues: ValidationIssue[] = [];
  private testScenarios: TestScenario[] = [];

  constructor(filePath: string) {
    this.filePath = filePath;

    // 读取文件
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    this.content = fs.readFileSync(filePath, 'utf-8');
    this.lines = this.content.split('\n');
  }

  /**
   * 执行全面验证
   */
  validate(): ValidationReport {
    // Step 1: 提取测试方法
    this.extractTestScenarios();

    // Step 2: 检查各类问题
    this.checkEmptyAssertions();
    this.checkScenarioCoverage();
    this.checkChineseComments();
    this.checkAssertionClarity();
    this.checkMockUsage();
    this.checkTestNaming();
    this.checkSetUpTearDown();

    // Step 3: 生成报告
    return this.generateReport();
  }

  /**
   * 提取所有测试方法及其场景
   */
  private extractTestScenarios(): void {
    // 匹配 TEST_F(TestClass, TestName) 和 CPPUNIT_TEST(testName)
    const testFRegex = /TEST_F\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
    const cppunitRegex = /void\s+(\w*test\w*)\s*\(\s*\)/gi;

    let match;
    const testLines = new Map<number, string>();

    // 找到所有 TEST_F 定义
    while ((match = testFRegex.exec(this.content)) !== null) {
      const lineNum = this.content.substring(0, match.index).split('\n').length;
      testLines.set(lineNum, match[0]);
    }

    // 为每个测试提取其完整代码块
    let currentTest: TestScenario | null = null;
    let braceCount = 0;
    let testStartLine = 0;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const lineNum = i + 1;

      // 检测 TEST_F 开始
      if (testFRegex.test(line) || testLines.has(lineNum)) {
        if (currentTest) {
          currentTest.endLine = i - 1;
          this.testScenarios.push(currentTest);
        }

        const nameMatch = line.match(/TEST_F\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
        currentTest = {
          name: nameMatch ? nameMatch[2] : `test_${i}`,
          startLine: lineNum,
          endLine: i,
          scenarioType: this.detectScenarioType(line),
          assertions: [],
          hasMock: false,
          hasChineseComment: false,
          mockCount: 0,
        };
        braceCount = 0;
        testStartLine = i;
      }

      // 跟踪代码块范围
      if (currentTest) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        // 检测测试内容
        if (line.includes('EXPECT_') || line.includes('ASSERT_') || line.includes('CPPUNIT_ASSERT')) {
          const assertMatch = line.match(/(EXPECT_EQ|EXPECT_THROW|EXPECT_CALL|ASSERT_EQ|CPPUNIT_ASSERT[_A-Z]*)\s*\([^)]*\)/);
          if (assertMatch) {
            currentTest.assertions.push(assertMatch[0]);
          }
        }

        // 检测 Mock 使用
        if (line.includes('EXPECT_CALL') || line.includes('MOCK_METHOD')) {
          currentTest.mockCount++;
          currentTest.hasMock = true;
        }

        // 检测中文注释
        if (/\/\/\s*\[/.test(line) && /[\u4e00-\u9fa5]/.test(line)) {
          currentTest.hasChineseComment = true;
        }

        // 检测代码块结束
        if (braceCount === 0 && currentTest && i > testStartLine) {
          currentTest.endLine = i;
          this.testScenarios.push(currentTest);
          currentTest = null;
        }
      }
    }

    // 收尾最后一个测试
    if (currentTest) {
      currentTest.endLine = this.lines.length - 1;
      this.testScenarios.push(currentTest);
    }
  }

  /**
   * 检测测试的场景类型
   */
  private detectScenarioType(testName: string): 'normal' | 'boundary' | 'exception' | 'unknown' {
    const lowerName = testName.toLowerCase();

    if (lowerName.includes('boundary') || lowerName.includes('max') || lowerName.includes('min') || lowerName.includes('overflow')) {
      return 'boundary';
    }
    if (lowerName.includes('exception') || lowerName.includes('error') || lowerName.includes('throw') || lowerName.includes('invalid')) {
      return 'exception';
    }
    if (lowerName.includes('normal') || lowerName.includes('basic') || lowerName.includes('positive')) {
      return 'normal';
    }

    return 'unknown';
  }

  /**
   * 检查空断言（没有实际检查内容）
   */
  private checkEmptyAssertions(): void {
    for (const scenario of this.testScenarios) {
      // 如果测试中没有任何断言
      if (scenario.assertions.length === 0) {
        this.issues.push({
          line: scenario.startLine,
          type: 'error',
          category: 'empty_assertion',
          code: 'E001',
          message: `测试 "${scenario.name}" 没有断言`,
          suggestion: '添加至少一个 EXPECT_* 或 ASSERT_* 断言来验证结果',
        });
      }

      // 检查空的断言（如 EXPECT_EQ() 没有参数）
      const testContent = this.lines.slice(scenario.startLine - 1, scenario.endLine).join('\n');
      const emptyAssertRegex = /(EXPECT_EQ|ASSERT_EQ|CPPUNIT_ASSERT_EQUAL)\s*\(\s*\)/g;
      let match;

      while ((match = emptyAssertRegex.exec(testContent)) !== null) {
        const lineOffset = testContent.substring(0, match.index).split('\n').length;
        this.issues.push({
          line: scenario.startLine + lineOffset - 1,
          type: 'error',
          category: 'empty_assertion',
          code: 'E002',
          message: `空断言：${match[1]}() 缺少参数`,
          suggestion: '提供期望值和实际值，如 EXPECT_EQ(7, result)',
        });
      }
    }
  }

  /**
   * 检查三类场景覆盖
   */
  private checkScenarioCoverage(): void {
    // 统计场景类型
    const coverage = {
      normal: 0,
      boundary: 0,
      exception: 0,
      unknown: 0,
    };

    for (const scenario of this.testScenarios) {
      coverage[scenario.scenarioType]++;
    }

    // 如果场景类型无法识别的测试过多，警告
    if (coverage.unknown > 0) {
      const unknownTests = this.testScenarios.filter(s => s.scenarioType === 'unknown');
      for (const test of unknownTests) {
        this.issues.push({
          line: test.startLine,
          type: 'warning',
          category: 'scenario_coverage',
          code: 'W001',
          message: `无法识别测试 "${test.name}" 的场景类型`,
          suggestion: '在测试名称中包含 Boundary/Exception/Normal，或添加场景标记注释 // [场景类型]',
        });
      }
    }

    // 检查是否缺少某类场景
    if (this.testScenarios.length > 0) {
      const hasAllScenarios = coverage.normal > 0 && coverage.boundary > 0 && coverage.exception > 0;
      if (!hasAllScenarios) {
        const missing = [];
        if (coverage.normal === 0) missing.push('正常路径');
        if (coverage.boundary === 0) missing.push('边界值');
        if (coverage.exception === 0) missing.push('异常处理');

        this.issues.push({
          line: 1,
          type: 'warning',
          category: 'scenario_coverage',
          code: 'W002',
          message: `缺少${missing.join('、')}场景的测试`,
          suggestion: '添加涵盖所有三类场景的测试用例以提高代码覆盖率',
        });
      }
    }
  }

  /**
   * 检查中文注释规范
   */
  private checkChineseComments(): void {
    const scenarioMarkRegex = /\/\/\s*\[(正常路径|边界值|异常处理)\]/;

    for (const scenario of this.testScenarios) {
      let hasScenarioMark = false;

      // 在测试代码块中查找场景标记
      const testContent = this.lines.slice(scenario.startLine - 1, scenario.endLine).join('\n');
      if (scenarioMarkRegex.test(testContent)) {
        hasScenarioMark = true;
      }

      // 如果没有场景标记，警告
      if (!hasScenarioMark && scenario.scenarioType === 'unknown') {
        this.issues.push({
          line: scenario.startLine,
          type: 'warning',
          category: 'comment_format',
          code: 'W003',
          message: `测试 "${scenario.name}" 缺少场景标记注释`,
          suggestion: '在测试方法内添加 // [正常路径] / [边界值] / [异常处理] 标记',
        });
      }

      // 检查中文注释规范
      const nonStandardComment = /\/\/\s*[^[\]\u4e00-\u9fa5]*[\u4e00-\u9fa5]/;
      for (let i = scenario.startLine - 1; i < scenario.endLine; i++) {
        const line = this.lines[i];
        if (nonStandardComment.test(line) && !scenarioMarkRegex.test(line)) {
          // 这里只是记录，不一定是错误
        }
      }
    }
  }

  /**
   * 检查断言清晰度
   */
  private checkAssertionClarity(): void {
    for (const scenario of this.testScenarios) {
      for (const assertion of scenario.assertions) {
        // 检查断言中是否有意义的值（不全是变量名）
        if (assertion.match(/EXPECT_EQ\s*\(\s*\w+\s*,\s*\w+\s*\)/)) {
          // 这是可接受的
        }

        // 检查是否有幻数（硬编码的数值）
        const magicNumbers = assertion.match(/\(\s*(-?\d+)\s*[,)]/g);
        if (magicNumbers && magicNumbers.length > 0) {
          // 如果断言中包含幻数，提示提取为常量
          this.issues.push({
            line: scenario.startLine,
            type: 'warning',
            category: 'clarity',
            code: 'W004',
            message: `断言中包含幻数（硬编码数值）`,
            suggestion: '将幻数定义为具名常量，提高可读性。例：const int EXPECTED_SUM = 7; EXPECT_EQ(EXPECTED_SUM, result);',
          });
        }
      }
    }
  }

  /**
   * 检查 Mock 使用规范
   */
  private checkMockUsage(): void {
    const mockDefineRegex = /class\s+Mock\w+\s*:\s*public\s+(\w+)/g;
    const mockDefines: string[] = [];

    let match;
    while ((match = mockDefineRegex.exec(this.content)) !== null) {
      mockDefines.push(match[1]);
    }

    // 如果有 Mock 定义，检查是否有相应的 MOCK_METHOD
    for (const scenario of this.testScenarios) {
      if (scenario.mockCount > 0) {
        const testContent = this.lines.slice(scenario.startLine - 1, scenario.endLine).join('\n');

        // 检查是否有 EXPECT_CALL
        if (!testContent.includes('EXPECT_CALL')) {
          this.issues.push({
            line: scenario.startLine,
            type: 'warning',
            category: 'mock_usage',
            code: 'W005',
            message: `测试中创建了 Mock 对象但未使用 EXPECT_CALL 验证`,
            suggestion: '使用 EXPECT_CALL(mock, method(...)) 来验证 Mock 对象的方法被正确调用',
          });
        }

        // 检查 Times() 设置
        if (!testContent.includes('.Times(')) {
          this.issues.push({
            line: scenario.startLine,
            type: 'warning',
            category: 'mock_usage',
            code: 'W006',
            message: `EXPECT_CALL 缺少 Times() 设置`,
            suggestion: '明确指定预期调用次数：.Times(1) / .Times(AtLeast(1)) / .Times(Any())',
          });
        }
      }
    }
  }

  /**
   * 检查测试命名规范
   */
  private checkTestNaming(): void {
    const namingRegex = /^[A-Z]\w*_\w+$/; // TestName_Scenario 格式

    for (const scenario of this.testScenarios) {
      if (!namingRegex.test(scenario.name)) {
        this.issues.push({
          line: scenario.startLine,
          type: 'warning',
          category: 'naming',
          code: 'W007',
          message: `测试名称 "${scenario.name}" 不符合命名规范`,
          suggestion: '使用 "方法名_场景" 格式，如 Add_TwoPositiveNumbers, Divide_ByZero',
        });
      }
    }
  }

  /**
   * 检查 SetUp/TearDown 生命周期
   */
  private checkSetUpTearDown(): void {
    // 如果有测试，应该有 SetUp 和 TearDown
    if (this.testScenarios.length > 0) {
      const hasSetUp = this.content.includes('void SetUp()') || this.content.includes('void setUp()');
      const hasTearDown = this.content.includes('void TearDown()') || this.content.includes('void tearDown()');

      if (!hasSetUp && !hasTearDown) {
        this.issues.push({
          line: 1,
          type: 'warning',
          category: 'lifecycle',
          code: 'W008',
          message: '未定义 SetUp/TearDown 生命周期方法',
          suggestion: '添加 SetUp() 和 TearDown() 方法来初始化和清理测试资源',
        });
      }
    }
  }

  /**
   * 生成验证报告
   */
  private generateReport(): ValidationReport {
    const coverage = {
      normal: 0,
      boundary: 0,
      exception: 0,
      unknown: 0,
    };

    for (const scenario of this.testScenarios) {
      coverage[scenario.scenarioType]++;
    }

    // 计算场景覆盖分数 (0-100)
    const scenarioCoverageScore = this.calculateScenarioCoverage();

    // 计算整体分数 (0-100)
    const errorPenalty = this.issues.filter(i => i.type === 'error').length * 5;
    const warningPenalty = this.issues.filter(i => i.type === 'warning').length * 2;
    const overallScore = Math.max(0, 100 - errorPenalty - warningPenalty);

    return {
      file: this.filePath,
      totalLines: this.lines.length,
      testCount: this.testScenarios.length,
      scenarioCoverage: coverage,
      issues: this.issues,
      summary: {
        totalIssues: this.issues.length,
        errorCount: this.issues.filter(i => i.type === 'error').length,
        warningCount: this.issues.filter(i => i.type === 'warning').length,
        emptyAssertions: this.issues.filter(i => i.code === 'E001' || i.code === 'E002').length,
        scenarioCoverage: scenarioCoverageScore,
        overallScore: Math.round(overallScore),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 计算场景覆盖分数
   */
  private calculateScenarioCoverage(): number {
    if (this.testScenarios.length === 0) return 0;

    const coverage = {
      normal: 0,
      boundary: 0,
      exception: 0,
    };

    for (const scenario of this.testScenarios) {
      if (coverage[scenario.scenarioType] !== undefined) {
        coverage[scenario.scenarioType]++;
      }
    }

    // 如果所有三类场景都有，给 100 分
    if (coverage.normal > 0 && coverage.boundary > 0 && coverage.exception > 0) {
      return 100;
    }

    // 否则按比例计分
    const hasCoverage = Object.values(coverage).filter(v => v > 0).length;
    return Math.round((hasCoverage / 3) * 100);
  }
}

// ============================================================================
// 命令行接口
// ============================================================================

/**
 * 验证单个文件
 */
function validateFile(filePath: string): ValidationReport {
  try {
    const validator = new CppTestValidator(filePath);
    return validator.validate();
  } catch (error) {
    return {
      file: filePath,
      totalLines: 0,
      testCount: 0,
      scenarioCoverage: { normal: 0, boundary: 0, exception: 0, unknown: 0 },
      issues: [{
        line: 0,
        type: 'error',
        category: 'system',
        code: 'E000',
        message: `验证失败：${(error as Error).message}`,
      }],
      summary: {
        totalIssues: 1,
        errorCount: 1,
        warningCount: 0,
        emptyAssertions: 0,
        scenarioCoverage: 0,
        overallScore: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 验证目录中的所有测试文件
 */
function validateDirectory(dirPath: string): ValidationReport[] {
  const results: ValidationReport[] = [];

  function processDir(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDir(fullPath);
      } else if (file.endsWith('_test.cpp') || file.endsWith('.cpp')) {
        const report = validateFile(fullPath);
        results.push(report);
      }
    }
  }

  processDir(dirPath);
  return results;
}

/**
 * 生成格式化的报告
 */
function formatReport(report: ValidationReport): string {
  let output = '';

  output += `\n${'='.repeat(70)}\n`;
  output += `C++ 单元测试验证报告\n`;
  output += `${'='.repeat(70)}\n\n`;

  output += `文件: ${report.file}\n`;
  output += `总行数: ${report.totalLines}\n`;
  output += `测试数量: ${report.testCount}\n\n`;

  output += `场景覆盖:\n`;
  output += `  - 正常路径: ${report.scenarioCoverage.normal}\n`;
  output += `  - 边界值: ${report.scenarioCoverage.boundary}\n`;
  output += `  - 异常处理: ${report.scenarioCoverage.exception}\n`;
  output += `  - 无法识别: ${report.scenarioCoverage.unknown}\n\n`;

  output += `质量评分: ${report.summary.overallScore}/100\n`;
  output += `  - 场景覆盖度: ${report.summary.scenarioCoverage}%\n`;
  output += `  - 错误数: ${report.summary.errorCount}\n`;
  output += `  - 警告数: ${report.summary.warningCount}\n`;
  output += `  - 空断言: ${report.summary.emptyAssertions}\n\n`;

  if (report.issues.length > 0) {
    output += `问题列表:\n`;
    output += `${'─'.repeat(70)}\n`;

    for (const issue of report.issues) {
      const typeIcon = issue.type === 'error' ? '❌' : '⚠️';
      output += `${typeIcon} [${issue.code}] (Line ${issue.line}) ${issue.message}\n`;
      if (issue.suggestion) {
        output += `   💡 建议: ${issue.suggestion}\n`;
      }
    }
  } else {
    output += `✅ 没有问题检测到！\n`;
  }

  output += `\n${'='.repeat(70)}\n`;
  output += `生成时间: ${report.timestamp}\n`;
  output += `${'='.repeat(70)}\n\n`;

  return output;
}

// ============================================================================
// 导出
// ============================================================================

export { CppTestValidator, validateFile, validateDirectory, formatReport };
export type { ValidationReport, ValidationIssue, TestScenario };

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('用法: npx ts-node cpp-test-validator.ts <文件路径|目录路径> [--json]');
    console.log('示例:');
    console.log('  npx ts-node cpp-test-validator.ts src/calculator_test.cpp');
    console.log('  npx ts-node cpp-test-validator.ts tests/ --json');
    process.exit(1);
  }

  const targetPath = args[0];
  const jsonFlag = args.includes('--json');

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ 文件或目录不存在: ${targetPath}`);
    process.exit(1);
  }

  const stat = fs.statSync(targetPath);

  if (stat.isDirectory()) {
    const reports = validateDirectory(targetPath);

    if (jsonFlag) {
      console.log(JSON.stringify(reports, null, 2));
    } else {
      for (const report of reports) {
        console.log(formatReport(report));
      }

      // 汇总统计
      const totalTests = reports.reduce((sum, r) => sum + r.testCount, 0);
      const totalIssues = reports.reduce((sum, r) => sum + r.summary.totalIssues, 0);
      const avgScore = Math.round(reports.reduce((sum, r) => sum + r.summary.overallScore, 0) / reports.length);

      console.log(`\n目录验证汇总:\n`);
      console.log(`  - 文件总数: ${reports.length}`);
      console.log(`  - 测试总数: ${totalTests}`);
      console.log(`  - 问题总数: ${totalIssues}`);
      console.log(`  - 平均评分: ${avgScore}/100\n`);
    }
  } else {
    const report = validateFile(targetPath);

    if (jsonFlag) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatReport(report));
    }
  }
}
