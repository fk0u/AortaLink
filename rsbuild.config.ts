import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './index.html',
    title: 'AortaLink — Personal EHR & Clinical Blood Pressure Platform',
    meta: {
      viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
      'theme-color': '#0f172a',
      description: 'AortaLink — Personal EHR & Clinical Blood Pressure Interoperability Platform for Internal Medicine Precision'
    }
  },
  source: {
    entry: {
      index: './src/main.tsx',
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8173,
  },
});
