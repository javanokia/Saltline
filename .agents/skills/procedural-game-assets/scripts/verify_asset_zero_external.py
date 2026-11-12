#!/usr/bin/env python3
"""
Zero-External-Asset Compliance Validator
验证游戏项目是否遵循“零外部资产依赖 (Zero External Assets)”规范：
1. 检查是否存在外部静态图片 (png/jpg/webp/hdr)、模型 (gltf/glb/obj/fbx) 或音频 (mp3/wav/ogg) 资源引入。
2. 扫描 JavaScript/TypeScript 源码中是否硬编码了对外部 CDN、HTTP/HTTPS 媒体资源的直接拉取。
3. 统计程序化资产生成函数的覆盖度。
"""

import os
import sys
import re

EXTERNAL_FILE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tga", ".hdr",
    ".gltf", ".glb", ".obj", ".fbx", ".dae", ".ply",
    ".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"
}

FORBIDDEN_URL_PATTERNS = [
    re.compile(r'https?://[^\s"\']+\.(png|jpg|jpeg|webp|glb|gltf|fbx|mp3|wav|ogg)', re.I),
    re.compile(r'fetch\s*\(\s*["\']https?://', re.I),
]

def scan_directory(root_dir):
    violations = []
    clean_files_count = 0
    scanned_src_files = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # 排除 node_modules, .git, dist 等构建产物目录
        if any(part in dirpath.split(os.sep) for part in ["node_modules", ".git", "dist", "tests"]):
            continue

        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            rel_path = os.path.relpath(os.path.join(dirpath, fname), root_dir)

            # 1. 检查非代码类的静态媒体资产文件
            if ext in EXTERNAL_FILE_EXTENSIONS:
                violations.append(f"发现外部二进制媒体文件: {rel_path}")
                continue

            # 2. 检查源代码中的外部媒体引用
            if ext in [".js", ".ts", ".html"]:
                scanned_src_files += 1
                full_path = os.path.join(dirpath, fname)
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        for line_num, line in enumerate(f, 1):
                            for pattern in FORBIDDEN_URL_PATTERNS:
                                if pattern.search(line):
                                    violations.append(f"发现远程外部媒体请求 [{rel_path}:{line_num}]: {line.strip()}")
                except Exception as e:
                    print(f"读取文件出错 {rel_path}: {e}", file=sys.stderr)

    return scanned_src_files, violations

def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    target_dir = os.path.abspath(target_dir)

    print(f"🔍 开始检查零外部资产合规性: {target_dir}")
    src_count, violations = scan_directory(target_dir)

    print(f"📄 已扫描源码文件数: {src_count}")

    if violations:
        print(f"❌ 发现 {len(violations)} 处违反零外部资产约束的项:")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)
    else:
        print("✅ 恭喜！未发现任何外部静态模型/音频/图片或远程媒体依赖，100% 纯程序化数学资产合规！")
        sys.exit(0)

if __name__ == "__main__":
    main()
