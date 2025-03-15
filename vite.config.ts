import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      // 指定组件位置，默认是src/components
      dirs: ['src/components'],
      // 配置文件生成位置
      dts: 'src/components.d.ts'
    }),
    AutoImport({
      imports: [
        'vue', // 包含Vue的自动导入
        // 其他需要自动导入的库或框架
      ],
    //dts: true, // 如果使用TypeScript，设置为true以生成类型声明文件
    dts: 'src/auto-imports.d.ts'
    }),
  ],
})
