# Sean Lingo 1.0.0 — 提交说明

## 已准备

- 独立名称、矢量图标及 16/32/48/128px PNG。
- Chrome / Edge MV3 安装包（位于 release/，以 sean-lingo-1.0.0 开头）。
- store-listing.md 中英文商店文案。
- images/ 内的图标、440×280 宣传图和 1280×800 实际界面截图。
- public/legal/privacy.html：可直接托管的中英文隐私政策。
- public/legal/open-source.html、LICENSE、THIRD_PARTY_NOTICES.txt。
- 同版本对应源码 ZIP。

## 提交前仍需由产品所有者配置

1. 准备并登录 Chrome Web Store 和 Microsoft Edge Partner Center 开发者账号，填写自己的发布者资料。
2. 将 privacy.html 放到可公开访问的 HTTPS 地址，并将该 URL 填入两个商店。扩展包内的隐私页面不能代替商店要求的公开 URL。
3. 本版源码仓库为 https://github.com/Sean1shao/sean-lingo 。分发安装包时提供匹配版本的提交、标签或源码 ZIP 下载地址；仅指向未修改的上游仓库不能代替本版源码。
4. 当前未配置赞助平台；不显示赞助按钮。取得实际链接后在 src/core/brand.ts 中填入 sponsorUrl，再构建。无需为赞助添加账号、支付 SDK 或额外权限。
5. 核对商店公开显示的姓名、邮箱、网站和各项数据披露后提交审核。

## 单一用途

用户主动触发的单词释义、发音和句子翻译。

## 权限用途说明

- storage：在浏览器本地保存翻译语言、服务选择、划词按钮开关；后台内存缓存近期词典结果，受限页面右键查询暂存于浏览器会话存储。
- contextMenus：在选中文字的右键菜单加入翻译入口。
- http://*/* 与 https://*/* 内容脚本：在普通网页读取用户选中的文本并显示翻译按钮和浮窗；不抓取整页正文，不发送当前页面 URL 或浏览历史。
- dict.youdao.com：获取有道词典结果及英文发音。
- www.youdao.com：获取有道句子翻译页面并提取结果。
- translate.googleapis.com：获取 Google 句子翻译结果。
- 不请求 identity、history、tabs、支付或远程代码执行权限。使用 chrome.tabs 的消息和基本 tab ID 操作不需要 tabs 权限。

## 数据披露填写依据

不能笼统填写“不处理任何用户数据”：用户提供的查询文本会发送给在线翻译/词典服务。请按商店当前字段明确披露这类用户文本/网站选中文字及其功能用途。

- 处理：主动查询文字、发音单词、源/目标语言与相关请求元数据（第三方可见网络 IP 等）。
- 用途：词典、翻译、发音；自动回退时同一文本可能发送给两个服务。
- 不内置：广告、行为追踪、开发者查询日志服务器、账号、浏览历史采集、查询数据买卖。
- 仅本地保存偏好；查询结果不持久化。后台内存最多缓存 100 条词典响应、有效期 5 分钟；浏览器受限页的待查询文字仅暂存会话，工具栏消费后移除。
- 支持邮箱收到的用户来信由开发者用于处理反馈，勿声称开发者永远不会接触用户提供的信息。

## 审核人员测试步骤

1. 无需账号，无需 API Key。安装后刷新普通 HTTPS 网页。
2. 选择 hello，点击“译”，应显示释义、英美音标和发音按钮。
3. 选择完整英文句子，点击“译”，应显示中文译文。
4. 点击工具栏图标，输入文字，按 Enter。
5. 设置页可选择目标语言、有道或 Google，查看隐私政策、开源声明及支持邮箱。
6. Google 需要网络能够访问其服务。若不可达，设置有道，源语言 en、目标语言 zh-CN 进行测试；公共服务可能限流，不承诺永久可用。

## 官方参考

- Chrome 发布：https://developer.chrome.com/docs/webstore/publish
- Chrome 图片规范：https://developer.chrome.com/docs/webstore/images
- Chrome 用户数据：https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- Edge 发布：https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- GPL-3.0：https://www.gnu.org/licenses/gpl-3.0.html

本目录只准备发布材料，尚未上传或提交到任何商店。
