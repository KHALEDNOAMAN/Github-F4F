import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import figlet from 'figlet';
import gradient from 'gradient-string';
import inquirer from 'inquirer';
import ora from 'ora';
import {Octokit} from '@octokit/rest';
import {logger, setTag} from './utils/logger.js';
import * as github from './utils/github.js';

dotenv.config();

const ENV_PATH = path.resolve(process.cwd(), '.env');

async function ensureToken() {
	if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
	const ans = await inquirer.prompt([
		{
			type: 'input',
			name: 'token',
			message: 'No GITHUB_TOKEN found. Paste a personal access token (with user scope) to continue:',
		},
	]);
	if (!ans.token) return null;
	fs.writeFileSync(ENV_PATH, `GITHUB_TOKEN=${ans.token}\n`);
	logger.info('Saved token to .env');
	process.env.GITHUB_TOKEN = ans.token;
	return ans.token;
}

function printLogo() {
	const text = figlet.textSync('GITHUB-F4F', {horizontalLayout: 'default'});
	const cols = process.stdout.columns || 80;
	const colored = gradient.rainbow.multiline(text);
	const lines = colored.split('\n');
	for (const line of lines) {
		const pad = Math.max(0, Math.floor((cols - line.replace(/\x1b\[[0-9;]*m/g, '').length) / 2));
		console.log(' '.repeat(pad) + line);
	}
}

async function main() {
	const token = await ensureToken();
	if (!token) {
		logger.error('No token provided. Exiting.');
		process.exit(1);
	}

	const octokit = new Octokit({auth: token});

	// set console tag to project name from package.json
	try {
		const pkgPath = path.resolve(process.cwd(), 'package.json');
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
		const projectName = pkg.name || 'project';
		setTag(projectName);
	} catch (err) {
		setTag('project');
	}

	console.clear();
	printLogo();
	console.log('\n');

	// Ask for pacing preference (affects delay between follow requests)
	const {pace} = await inquirer.prompt([
		{type: 'list', name: 'pace', message: 'Select pacing (slower = fewer requests)', choices: [
			{name: 'Fast (0.5-1s)', value: 'fast'},
			{name: 'Normal (1-3s)', value: 'normal'},
			{name: 'Slow (3-7s)', value: 'slow'},
		], default: 'normal'}
	]);
	let delayOpts = {delayMin: 1000, delayMax: 3000};
	if (pace === 'fast') delayOpts = {delayMin: 500, delayMax: 1000};
	if (pace === 'slow') delayOpts = {delayMin: 3000, delayMax: 7000};

	while (true) {
		const {mode} = await inquirer.prompt([
			{
				type: 'list',
				name: 'mode',
				message: 'Choose action',
				choices: [
					{name: 'Auto: follow random users', value: 'random'},
					{name: "Follow from a user's followers/following", value: 'fromUser'},
					{name: 'Exit', value: 'exit'},
				],
			},
		]);

		if (mode === 'exit') break;

		if (mode === 'random') {
			const {count} = await inquirer.prompt([{type: 'number', name: 'count', message: 'How many users to follow?', default: 5}]);
			console.log('Following random users...');
			try {
				const result = await github.followRandom(octokit, logger, {count, ...delayOpts});
				console.log(`Done: followed ${result.followed} users`);
			} catch (err) {
				console.error('Operation failed', err);
				logger.error(err);
			}
		}

		if (mode === 'fromUser') {
			const answers = await inquirer.prompt([
				{type: 'input', name: 'target', message: 'Target username to pull from:'},
				{type: 'list', name: 'listType', message: 'Use which list?', choices: [{name: 'Followers', value: 'followers'}, {name: 'Following', value: 'following'}]},
				{type: 'number', name: 'count', message: 'How many users to follow?', default: 10},
			]);
			console.log('Following from list...');
			try {
				// pass null tag because logger default tag is already set to project name
				const result = await github.followFromList(octokit, logger, answers.target, answers.listType, answers.count, null, delayOpts);
				console.log(`Done: followed ${result.followed} users from ${answers.target}`);
			} catch (err) {
				console.error('Operation failed', err);
				logger.error(err);
			}
		}
	}

	logger.info('Exiting.');
	process.exit(0);
}

main();