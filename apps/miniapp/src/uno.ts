// uno.css 必须在独立模块引入：uni 的 mp 主入口解析器会把 main.ts 的每个静态 import
// 丢给 vite resolver，虚拟 css 模块在 vite8/rolldown 下会崩（Cannot read 'context'）。
// 解析器不递归进入 ts 模块内部，借此绕过。
import 'uno.css';
