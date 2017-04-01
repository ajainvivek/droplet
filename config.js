/* Each language object has 3 attributes:
	+ filename, for specifying which file inside the `i18n` directory should be used
	+ fallback, another language key that will be used as a fallback, if null the raw translation key will be used
	+ isRTL, a boolean flag to tell if the language is right-to-left
*/
languages = {
	'it': {
		filename: 'it',
		fallback: 'en',
		isRTL: false
	},
	'en': {
		filename: 'en',
		fallback: null,
		isRTL: true
	},
}

// the language that will be used in the building process of the skin
const currentLanguage = process.env.LANGUAGE || 'en'
if (!languages[currentLanguage]) {
	throw("Undefined language: " + currentLanguage)
}
const language = languages[currentLanguage]

// the environment that will be considered when building the skin, either `production` or `development`
const nodeEnv = process.env.NODE_ENV || 'development'

module.exports = {
	currentLanguage: currentLanguage,
	language: language,

	nodeEnv: nodeEnv,
	isProduction: nodeEnv === 'production'
}