#!/usr/bin/env node
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
    console.log('Run without any arguments to use the interactive mode\nspp --help or spp -h to show this message\nspp [pdfstring] to directly download the PDF. eg: spp 0625_s19_qp_11');
    process.exit(0);
}

import axios from 'axios';
import fs from 'fs';
import inquirer from 'inquirer';
import { input, select } from '@inquirer/prompts';
import SearchBox from 'inquirer-search-list';
import { createSpinner } from 'nanospinner'
import { subjects } from './subjects.js';

inquirer.registerPrompt('search-list', SearchBox);

async function main() {
    let code = '';

    if (process.argv.length == 2) {
        const board = await select({
            message: 'Select a board',
            choices: [
                {
                    name: 'Cambridge IGCSE',
                    value: 'igcse',
                },
                {
                    name: 'Cambridge O levels',
                    value: 'olvls',
                },
                {
                    name: 'Cambridge Int\'l AS & A Levels',
                    value: 'alvls',
                }
            ],
        });

        let subject;
        await inquirer
            .prompt([
                {
                    type: "search-list",
                    message: "Enter subject name/code",
                    name: "subject",
                    choices: subjects[board],
                }
            ])
            .then(
                (selection) => {
                    subject = selection.subject.slice(-6).replace(/[()]/g, "");
                }
            )

        const year = (await input({
            message: 'Enter year',
            validate: (year) => {
                if (isNaN(year)) return 'Please enter a valid year';
                else if (year.length != 4) return 'Please enter a valid year';

                let yearInt = parseInt(year);
                if (yearInt > 2000) return true
                else return 'Please enter a year greater than 2000';
            }
        })).slice(-2);

        let sessions = [
            {
                name: 'May/Jun',
                value: 's',
            },
            {
                name: 'Oct/Nov',
                value: 'w',
            }
        ]

        if (board != 'olvls') {
            sessions.unshift({
                name: 'Feb/Mar',
                value: 'm',
            })
        }

        const session = await select({
            message: 'Select a session',
            choices: sessions,
        });

        const type = await select({
            message: 'Select a paper type',
            choices: [
                {
                    name: 'Question paper',
                    value: 'qp',
                },
                {
                    name: 'Mark scheme',
                    value: 'ms',
                },
                {
                    name: 'Insert',
                    value: 'in',
                },
                {
                    name: 'Examiner report',
                    value: 'er',
                },
                {
                    name: 'Grade threshold',
                    value: 'gt',
                },
            ],
        });

        let paper = '';
        let variant = '';

        if (type == 'er' || type == 'gt') code = `${subject}_${session}${year}_${type}`;
        else {
            paper = await input({
                message: 'Enter paper number',
                validate: (paper) => {
                    if (isNaN(paper)) return 'Please enter a valid number';
                    else if (paper.length != 1) return 'Please enter a single-digit number';
                    else return true;
                }
            });

            if (session === 'm') variant = '2'
            else {
                variant = await select({
                    message: 'Select a variant',
                    choices: [
                        {
                            name: '1',
                            value: '1',
                        },
                        {
                            name: '2',
                            value: '2',
                        },
                        {
                            name: '3',
                            value: '3',
                        }
                    ],
                })
            }

            code = `${subject}_${session}${year}_${type}_${paper}${variant}`
        }
    } else code = process.argv[2].replace(/\.pdf$/, "");

    const spinner = createSpinner('Downloading PDF').start()

    const response = await axios.get(`https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${code}.pdf`, { responseType: 'arraybuffer' });
    if (response.request.res.responseUrl === 'https://papacambridge.com/home/index.html') {
        spinner.error({ text: 'This document does not exist, try again' });
        if (process.argv.length === 2) main();
    }
    else {
        fs.writeFileSync(`${code}.pdf`, response.data);
        spinner.success({ text: `PDF saved to ${process.cwd()} as ${code}.pdf` });
    }
}

main();
