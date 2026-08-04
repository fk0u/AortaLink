import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './index.html',
    title: 'AortaLink — Open-Source AI-Powered EHR Platform (HL7 FHIR R4)',
    meta: {
      viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
      'theme-color': '#0f172a',
      description: 'AortaLink — Open-Source AI-Powered EHR Platform (HL7 FHIR R4 Compliant) for Clinical Interoperability and Decision Support'
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
    host: '0.0.0.0',
    port: 8173,
    proxy: {
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        pathRewrite: { '^/api/nvidia': '' },
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
