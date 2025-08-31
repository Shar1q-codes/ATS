// Bundle analysis and optimization utilities

export interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  modules: ModuleInfo[];
  assets: AssetInfo[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  modules: string[];
}

export interface ModuleInfo {
  name: string;
  size: number;
  chunks: string[];
}

export interface AssetInfo {
  name: string;
  size: number;
  type: "js" | "css" | "image" | "font" | "other";
}

class BundleAnalyzer {
  private stats: BundleStats | null = null;

  async analyzeBundleSize(): Promise<BundleStats> {
    if (typeof window === "undefined") {
      throw new Error("Bundle analysis only available in browser");
    }

    // Get performance entries for resources
    const resources = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];

    const assets: AssetInfo[] = resources
      .filter((resource) => resource.name.includes("/_next/static/"))
      .map((resource) => ({
        name: this.extractAssetName(resource.name),
        size: resource.transferSize || 0,
        type: this.getAssetType(resource.name),
      }));

    // Calculate total sizes
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);

    // Estimate gzipped size (typically 70% of original for text assets)
    const gzippedSize = assets.reduce((sum, asset) => {
      const compressionRatio = this.getCompressionRatio(asset.type);
      return sum + asset.size * compressionRatio;
    }, 0);

    this.stats = {
      totalSize,
      gzippedSize,
      chunks: this.analyzeChunks(assets),
      modules: this.analyzeModules(assets),
      assets,
    };

    return this.stats;
  }

  private extractAssetName(url: string): string {
    const parts = url.split("/");
    return parts[parts.length - 1];
  }

  private getAssetType(url: string): AssetInfo["type"] {
    if (url.endsWith(".js")) return "js";
    if (url.endsWith(".css")) return "css";
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) return "image";
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return "font";
    return "other";
  }

  private getCompressionRatio(type: AssetInfo["type"]): number {
    switch (type) {
      case "js":
      case "css":
        return 0.3; // ~70% compression
      case "image":
        return 0.9; // Images are already compressed
      case "font":
        return 0.8; // Fonts have some compression
      default:
        return 0.7;
    }
  }

  private analyzeChunks(assets: AssetInfo[]): ChunkInfo[] {
    const jsAssets = assets.filter((asset) => asset.type === "js");

    return jsAssets.map((asset) => ({
      name: asset.name,
      size: asset.size,
      modules: [asset.name], // Simplified - would need webpack stats for real module info
    }));
  }

  private analyzeModules(assets: AssetInfo[]): ModuleInfo[] {
    // Simplified module analysis - would need webpack stats for detailed info
    return assets.map((asset) => ({
      name: asset.name,
      size: asset.size,
      chunks: [asset.name],
    }));
  }

  getRecommendations(): string[] {
    if (!this.stats) return [];

    const recommendations: string[] = [];
    const { totalSize, assets } = this.stats;

    // Check total bundle size
    if (totalSize > 1024 * 1024) {
      // > 1MB
      recommendations.push(
        "Total bundle size is large (>1MB). Consider code splitting."
      );
    }

    // Check for large individual assets
    const largeAssets = assets.filter((asset) => asset.size > 200 * 1024); // > 200KB
    if (largeAssets.length > 0) {
      recommendations.push(
        `Large assets detected: ${largeAssets.map((a) => a.name).join(", ")}`
      );
    }

    // Check for duplicate dependencies
    const jsAssets = assets.filter((asset) => asset.type === "js");
    if (jsAssets.length > 10) {
      recommendations.push(
        "Many JS chunks detected. Consider optimizing chunk splitting."
      );
    }

    // Check for unused CSS
    const cssAssets = assets.filter((asset) => asset.type === "css");
    if (cssAssets.some((asset) => asset.size > 100 * 1024)) {
      recommendations.push(
        "Large CSS files detected. Consider purging unused CSS."
      );
    }

    return recommendations;
  }

  formatSize(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  generateReport(): string {
    if (!this.stats) return "No bundle stats available";

    const { totalSize, gzippedSize, assets } = this.stats;
    const recommendations = this.getRecommendations();

    let report = `Bundle Analysis Report\n`;
    report += `========================\n\n`;
    report += `Total Size: ${this.formatSize(totalSize)}\n`;
    report += `Gzipped Size: ${this.formatSize(gzippedSize)}\n`;
    report += `Compression Ratio: ${((1 - gzippedSize / totalSize) * 100).toFixed(1)}%\n\n`;

    report += `Assets by Type:\n`;
    const assetsByType = assets.reduce(
      (acc, asset) => {
        acc[asset.type] = (acc[asset.type] || 0) + asset.size;
        return acc;
      },
      {} as Record<string, number>
    );

    Object.entries(assetsByType).forEach(([type, size]) => {
      report += `  ${type.toUpperCase()}: ${this.formatSize(size)}\n`;
    });

    if (recommendations.length > 0) {
      report += `\nRecommendations:\n`;
      recommendations.forEach((rec, i) => {
        report += `  ${i + 1}. ${rec}\n`;
      });
    }

    return report;
  }
}

// Create singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// React hook for bundle analysis
export function useBundleAnalysis() {
  const [stats, setStats] = React.useState<BundleStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const analyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const bundleStats = await bundleAnalyzer.analyzeBundleSize();
      setStats(bundleStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendations = () => {
    return bundleAnalyzer.getRecommendations();
  };

  const generateReport = () => {
    return bundleAnalyzer.generateReport();
  };

  return {
    stats,
    isLoading,
    error,
    analyze,
    getRecommendations,
    generateReport,
    formatSize: bundleAnalyzer.formatSize.bind(bundleAnalyzer),
  };
}

// Import React for the hook
import React from "react";
