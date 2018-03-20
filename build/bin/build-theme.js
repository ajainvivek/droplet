const { JSDOM } = require("JSDOM")
const fs = require("fs")
const { upperFirst } = require("lodash")
const mkdirp = require("mkdirp")
const beautify = require("js-beautify")

const lookup = require("./../../schema/lookup.json")
const templateReg = /<(?:\/)?template[\s\S]*?(?:lang="\s*(.*)\s*")?\s*>/ig
const scriptReg = /<(?:\/)?script[\s\S]*?(?:lang="\s*(.*)\s*")?\s*>/ig
const styleReg = /<(?:\/)?style[\s\S]*?(?:lang="\s*(.*)\s*")?\s*(?:scoped)?\s*>/ig

const config = {
	"indent_size": 2,
	"indent_level": 6,
	"brace_style": "collapse,preserve-inline",
	"jslint_happy": true,
	"keep_array_indentation": true,
	"max_preserve_newlines": 3,
	"indent_with_tabs": true,
	"eol": "\n"
}

function getCode(code, block, expReg) {
	let split = code.split(expReg, 4)
	let match = code.match(expReg)
	if (!match) {
		return null
	}
	if (!/src/.test(match)) {
		if (block === "template") {
			if (!split[1]) {
				return match[0] + "\n" + beautify.html(split[2], config) + "\n" + match[1]
			}
		} else if (block === "style") {
			if (split[1] === undefined || split[1] === "scss" || split[1] === "less") {
				return match[0] + "\n" + beautify.css(split[2], config) + "\n" + match[1]
			}
		} else {
			if (split[1] === undefined || split[1] === "TypeScript") {
				return match[0] + "\n" + beautify(split[2], config) + "\n" + match[1]
			}
		}
	}
	return match[0] + split[2] + match[1]
}

const vueFormatter = function(text) {
	if (!text) {
		return
	} else {
		let html = getCode(text, "template", templateReg)
		let script = getCode(text, "script", scriptReg)
		let style = getCode(text, "style", styleReg)
		return (html ? html + "\n" : "") + (script ? "\n" + script + "\n" : "") + (style ? "\n" + style + "\n" : "")
	}
}

const constructTemplate = function(dom, template, root) {
	let element = JSDOM.fragment(`<${lookup[template.type]}></${lookup[template.type]}>`)

	// Add attributes to the element, if it exists
	if (template.properties) {
		const properties = Object.keys(template.properties)
		for (let i = 0; i < properties.length; i++) {
			element.firstChild.setAttribute([properties[i]], template.properties[properties[i]])
		}
	}
	// Add inner html, if content exist
	if (template.content) {
		element.firstChild.innerHTML = template.content
	}
	// Append children, if they exist
	if (template.children) {
		for (let i = 0; i < template.children.length; i++) {
			const children = constructTemplate(dom, template.children[i])
			element.firstChild.appendChild(children.firstChild)
		}
	}
	// if root element then wrap the template
	if (root) {
		return `<template>${element.firstChild.outerHTML}</template>`
	}

	return element
}

const constructScript = function(view, meta) {
	return `
        <script>
            export default {
				name: "${view}",
                meta() {
					return {
						title: "${meta.title}",
						description: "${meta.description}"
					}
				}				
            }
        </script>
    `
}

const constructStyle = function(view, style) {
	if (style) {
		return `
			<style lang="scss" scoped>
				.${view} {
					${style}
				}
			</style>	
		`
	} else {
		return ""
	}
}

const initialize = function() {
	const dom = new JSDOM()
	const themesFolder = "./themes"
	fs.readdir(themesFolder, (err, files) => {
		files.forEach((dir) => {
			mkdirp(`client/views/${dir}`, (err) => {
				if (err) console.error(err)
				else console.log(`created theme directory ${dir}`)
			})
			fs.readdir(`${themesFolder}/${dir}`, (err, files) => {
				files.forEach((file) => {
					file = upperFirst(file.replace(/\.[^/.]+$/, ""))
					const theme = require(`./../../themes/${dir}/${file}`)
					const filepath = `client/views/${dir}/${file}.vue`
					let fileContent = ""
					const template = constructTemplate(dom, theme, true)
					const script = constructScript(file, theme.meta || {})
					const style = constructStyle(file, theme.style || "")
					fileContent += template
					fileContent += style
					fileContent += script
					fileContent = vueFormatter(fileContent)
					fs.writeFile(filepath, fileContent, (err) => {
						if (err) throw err
						console.log(`The ${file} page was succesfully created!`)
					})
				})
			})
		})
	})
}

initialize()
