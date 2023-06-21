import eslint from '@rollup/plugin-eslint';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    name: 'libmjolnir',
    format: 'module'
  },
  plugins: [
    typescript({
      exclude: ["**/__tests__", "**/*.test.ts"]
    }),
    eslint()
  ]
};

if (process.env.NODE_ENV === "production") {
  config.plugins.push(
    terser({
      ecma: 2019,
      toplevel: true,
      format: {
        comments: false,
      }
    })
  );
}