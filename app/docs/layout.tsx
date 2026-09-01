"use client"

import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

import "./docs.css"

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout sidebar={{enabled: true}} tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
