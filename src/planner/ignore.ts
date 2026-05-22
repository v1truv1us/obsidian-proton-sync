const DEFAULT_IGNORES = [".obsidian/**", ".obsidian"];

export function shouldIgnore(path: string, patterns: string[]): boolean {
	const allPatterns = [...DEFAULT_IGNORES, ...patterns];

	for (const pattern of allPatterns) {
		if (matchesPattern(path, pattern)) {
			return true;
		}
	}

	return false;
}

function matchesPattern(path: string, pattern: string): boolean {
	// Exact match
	if (path === pattern) return true;

	// Directory wildcard: .obsidian/** matches .obsidian/ and everything under it
	if (pattern.endsWith("/**")) {
		const dir = pattern.slice(0, -3);
		if (path === dir || path.startsWith(dir + "/")) {
			return true;
		}
	}

	// Simple glob: *.tmp
	if (pattern.startsWith("*.")) {
		const ext = pattern.slice(1); // .tmp
		return path.endsWith(ext);
	}

	// Prefix match: path starts with pattern/
	if (pattern.endsWith("/")) {
		return path.startsWith(pattern);
	}

	// Simple wildcard in middle or end
	if (pattern.includes("*")) {
		const regex = new RegExp(
			"^" + pattern.replace(/\*\*/g, "<<<DOUBLESTAR>>>").replace(/\*/g, "[^/]*").replace(/<<<DOUBLESTAR>>>/g, ".*") + "$"
		);
		return regex.test(path);
	}

	return false;
}
