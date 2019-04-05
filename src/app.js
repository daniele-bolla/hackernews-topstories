import 'css-reset-and-normalize'
import './style.css'
import { functionTypeAnnotation } from '@babel/types';
/**Dom */
const selectEl = (selector, parent = document) => parent.querySelector(selector)
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
const sliceBy = (list, start, end) => list.slice(start, end)
/**Templates */
const useArticleTemplate = (url, title) => (`
	<h2><a target="_blank" onclick="event.stopPropagation()" href="${url}">${title}</a></h2>
	<button class="btn-comments-loader">load comments</button>
`)
const useCommentsTemplate = (text, by) => (`
	<h3>&raquo; by: <strong>${by}</strong></h3>
	<p>${text}</p>
`)
/**Api */
const baseApi = `https://hacker-news.firebaseio.com/v0`
const topStoriesApi = `${baseApi}/topstories.json?print=pretty`
/**App */
const main = () => {
	const context = {
		topStories: [],
		articles: []
	}
	const $wrap = selectEl('.wrap')
	const $sentinel = createNodeFromTemplate(null, 'div', { 'class': 'sentinel' })
	const renderArticles = (articles) => {
		const articlesWithFLow = articles.map(article => {
			article.flow = coroutine(hackerNewsStreamer, article.kids, 2)
			return article;
		})
		context.articles = [...context.articles, ...articlesWithFLow]
		articles.forEach(({ url, title, id, kids}) => {
			const template = useArticleTemplate(url, title)
			const attrs = { 'class': `article`, id }
			const node = createNodeFromTemplate(template, 'article', attrs)
			$wrap.appendChild(node)
		})
		$wrap.appendChild($sentinel)
	}
	const renderComments = (comments, currentComponent) => {
		comments.forEach((comment) => {
			const {id, text, by} = comment
			const template = useCommentsTemplate(text, by)
			const attrs = { 'class': `comment comment-${id}`, id }
			const node = createNodeFromTemplate(template, 'div', attrs)
			const button = selectEl('.btn-comments-loader', currentComponent)
			currentComponent.insertBefore(node, button)
		})
	}
	/**Streamer and Consumer*/
	async function* hackerNewsStreamer(ids, slice) {
		let start = 0;
		while(start <= ids.length){
			let urls = sliceBy(ids, start, start + slice).map(id => `${baseApi}/item/${id}.json?print=pretty`)
			yield await Promise.all(urls.map(fetchAsyncA));
			start += slice;
		}
	}
	const hackerNewsConsumer = async(flow, cbk, ...params)=>{
		const {value:articles} = await flow()
		cbk(articles, ...params)
	}
	const coroutine = (generator, ...params)=>{
		const iterator = generator(...params)
		return function(){
			return iterator.next.apply(iterator,arguments)
		}
	}
	/**Streaming ....*/
	fetchAsyncA(topStoriesApi).then((topStories) => {
		/** move this code todo*/
		context.topStories = topStories
		const flow = coroutine(hackerNewsStreamer,topStories, 2)
		hackerNewsConsumer(flow, renderArticles)
		/**Intersection Observer */
		const scrollObserverOptions = {
			root: null,
			rootMargin: '0px',
			threshold: 0.25
		}
		const handleScrollIntersection = (entries, observerObj) => {
			const { isIntersecting } = entries[0];
			if (isIntersecting) {
				hackerNewsConsumer(flow, renderArticles)
			} else {
				return
			}
		}
		const scrollObserver = new IntersectionObserver(handleScrollIntersection, scrollObserverOptions);
		scrollObserver.observe($sentinel);
		/**Load Comments with Click */
		$wrap.addEventListener('click',(event) => {
			const currentComponent = event.target.parentNode
			const id = currentComponent.getAttribute("id")
			const currentArticle = context.articles.find(item => id == id)
			hackerNewsConsumer(currentArticle.flow, renderComments, currentComponent)
		})
		/*end todo*/
	})
}
document.addEventListener('DOMContentLoaded', main())

