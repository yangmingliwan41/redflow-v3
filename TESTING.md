# 单元测试指南

## 测试框架

项目使用 [Vitest](https://vitest.dev/) 作为测试框架，它是 Vite 原生的测试运行器，具有快速、轻量级的特点。

## 安装依赖

```bash
npm install
```

测试相关依赖已包含在 `package.json` 中：
- `vitest` - 测试框架
- `@vitest/ui` - 测试 UI 界面
- `@vue/test-utils` - Vue 组件测试工具
- `happy-dom` - DOM 环境模拟

## 运行测试

### 运行所有测试
```bash
npm test
```

### 监听模式（自动运行）
```bash
npm test -- --watch
```

### 运行测试 UI
```bash
npm run test:ui
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

## 测试文件结构

测试文件应放在与被测试文件相同的目录下，使用 `__tests__` 文件夹：

```
src/
├── utils/
│   ├── __tests__/
│   │   └── string.test.ts
│   └── string.ts
├── services/
│   ├── ai/
│   │   ├── __tests__/
│   │   │   └── imageAnalysis.test.ts
│   │   └── imageAnalysis.ts
│   └── storage/
│       ├── __tests__/
│       │   └── user.test.ts
│       └── user.ts
```

## 编写测试

### 基本测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { cleanAsciiString } from '../string'

describe('cleanAsciiString', () => {
  it('should remove non-ASCII characters', () => {
    const input = 'test\u00A0key'
    const result = cleanAsciiString(input)
    expect(result).toBe('testkey')
  })
})
```

### Mock 示例

```typescript
import { vi } from 'vitest'
import { callGoogleGenAIAPI } from '../google'

vi.mock('../google')

describe('analyzeProductImage', () => {
  it('should parse JSON response', async () => {
    vi.mocked(callGoogleGenAIAPI).mockResolvedValue({
      text: JSON.stringify({ name: 'test' }),
      usage: { promptTokens: 100, candidatesTokens: 200, totalTokens: 300 }
    })
    
    // 测试代码...
  })
})
```

## 测试覆盖范围

### 当前测试覆盖

- ✅ `utils/string.ts` - 字符串工具函数
- ✅ `services/ai/imageAnalysis.ts` - 图片分析服务
- ✅ `services/storage/user.ts` - 用户存储服务

### 待添加测试

- [ ] `utils/validation.ts` - 验证函数
- [ ] `utils/debounce.ts` - 防抖节流
- [ ] `utils/image.ts` - 图片处理
- [ ] `services/ai/google.ts` - Google API 服务
- [ ] `services/ai/deepseek.ts` - DeepSeek API 服务
- [ ] `services/storage/history.ts` - 历史记录服务
- [ ] `composables/useLogger.ts` - 日志组合函数
- [ ] `composables/useError.ts` - 错误处理组合函数

## 测试最佳实践

1. **测试命名**：使用描述性的测试名称，说明测试的内容
2. **单一职责**：每个测试只测试一个功能点
3. **Mock 外部依赖**：Mock API 调用、localStorage 等外部依赖
4. **清理状态**：使用 `beforeEach` 清理测试状态
5. **覆盖率目标**：核心业务逻辑应达到 80% 以上覆盖率

## CI/CD 集成

可以在 CI/CD 流程中添加测试步骤：

```yaml
# GitHub Actions 示例
- name: Run tests
  run: npm test
```

## 调试测试

### VS Code 调试配置

在 `.vscode/launch.json` 中添加：

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## 常见问题

### 1. localStorage 未定义

使用 `happy-dom` 作为测试环境，它提供了 `localStorage` 的模拟实现。

### 2. Vue 组件测试

使用 `@vue/test-utils` 来测试 Vue 组件：

```typescript
import { mount } from '@vue/test-utils'
import MyComponent from '../MyComponent.vue'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent)
    expect(wrapper.text()).toContain('Hello')
  })
})
```

### 3. 异步测试

使用 `async/await` 处理异步测试：

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```





