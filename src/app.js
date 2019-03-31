/**Dom */
const selectEl = (selector, parent = document) => parent.querySelector(selector)
const selectEls = (selector, parent = document) => parent.querySelectorAll(selector)
const show = elem => elem.style.display = 'block'
const hide = elem => elem.style.display = 'none'
const createNodeFromTemplate = (template, wrapper, wrapperAttrs) => {
	const node = document.createElement(wrapper)
	for (const [key, value] of Object.entries(wrapperAttrs)) {
		node.setAttribute(key, value)
	}
	node.innerHTML = template;
	return node;
}
/**Utils */
const fetchAsyncA = async (url) => await (await fetch(url)).json()
var sliceBy = (list, size) => list.slice(0, size)
/**App */
const baseApi = `https://hacker-news.firebaseio.com/v0`
const topStoriesApi = `${baseApi}/topstories.json?print=pretty`
const main = () => {
	const $wrap = selectEl('.wrap')
	const useArticleTemplate = (url, title) => (`
		<a target="_blank" href="${url}">
			<h2><a>${title}</a></h2>
		</article>
		`)
	fetchAsyncA(topStoriesApi).then((data) => {
		const urls = sliceBy(data, 10).map(id => `${baseApi}/item/${id}.json?print=pretty`)
		const results = urls.map(fetchAsyncA)
		Promise.all(results).then((articles) => {
			articles.forEach(({ url, title }) => {
				const template = useArticleTemplate(url, title);
				const node = createNodeFromTemplate(template, 'article', { 'class': 'article' })
				$wrap.appendChild(node);
			})
		})
	})
}
document.addEventListener('DOMContentLoaded', main())

