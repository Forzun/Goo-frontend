"use client"
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared"
import { pixel } from "@/app/page"


export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span
            style={{
              ...pixel,
              fontSize: "50px",
              color: "#FF8D52",
              lineHeight: 1,
            }}
          >
            G
          </span>

          <span style={{ fontSize: "20px" }}>
            GooCli
          </span>
        </>
      ),

      url: "/",
    },
  };
}
