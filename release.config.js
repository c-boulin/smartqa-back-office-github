// release.config.js
export default {
    "plugins": [
        ["@semantic-release/commit-analyzer", {
            "parserOpts": {
                "issuePrefixes": ["DVDATING-"],
                "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
            },
            "releaseRules": [
                {"type": "docs", "scope":"README", "release": "patch"},
                {"type": "chore", "scope": "deps", "release": "patch"},
                {"type": "fix", "scope": "deps", "release": "patch"},
                {"type": "dep", "release": "patch"}
            ]
        }],
        ["@semantic-release/release-notes-generator", {
            "presetConfig": {
                "compareUrlFormat": "https://github.com/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}",
                "commitUrlFormat": "https://github.com/{{owner}}/{{repository}}/commit/{{hash}}",
                "issueUrlFormat": "https://github.com/{{owner}}/{{repository}}/issues/{{id}}",
                "types": [
                    {"type": "feat", "section": "Features"},
                    {"type": "fix", "section": "Bug Fixes"},
                    {"type": "docs", "section": "Documentation"},
                    {"type": "dep", "section": "Dependencies"}
                ]
            },
            "parserOpts": {
                "issuePrefixes": ["DVDATING-"],
                "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
            },
            "writerOpts": {
                "commitsSort": ["subject", "scope"]
            }
        }],
        "@semantic-release/changelog",
        ["@semantic-release/github", {
            "successCommentCondition": "<% return issue.pull_request; %>",
            "failCommentCondition": false
        }],
        ["@semantic-release/npm", {
            "npmPublish": false
        }],
        ["@semantic-release/git", {
            "assets": ["CHANGELOG.md", "package-lock.json", "package.json"],
            "message": "chore(release): ${nextRelease.version} [skip release]\n\n${nextRelease.notes}"
        }]
    ],
    "preset": "conventionalcommits",
    "tagFormat": "${version}"
}
