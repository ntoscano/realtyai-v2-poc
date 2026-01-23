module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Downgrade all rules to warnings (level 1) instead of errors (level 2)
		'body-leading-blank': [1, 'always'],
		'body-max-line-length': [1, 'always', 100],
		'footer-leading-blank': [1, 'always'],
		'footer-max-line-length': [1, 'always', 100],
		'header-max-length': [1, 'always', 100],
		'subject-case': [
			1,
			'never',
			['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
		],
		'subject-empty': [1, 'never'],
		'subject-full-stop': [1, 'never', '.'],
		'type-case': [1, 'always', 'lower-case'],
		'type-empty': [1, 'never'],
		'type-enum': [
			1,
			'always',
			[
				'build',
				'chore',
				'ci',
				'docs',
				'feat',
				'fix',
				'perf',
				'refactor',
				'revert',
				'style',
				'test',
			],
		],
	},
};
