import { createTrigger, TriggerStrategy } from '@activepieces/framework';
import { rssFeedUrl } from '../common/props';
import FeedParser from 'feedparser';
import axios from 'axios';

export const rssNewItemTrigger = createTrigger({
    name: 'new-item',
    displayName: 'New Item In Feed',
    description: 'Runs when a new item is added in the RSS feed',
    type: TriggerStrategy.POLLING,

    sampleData: {
        "title": "AWS Cloud Quest: Container Services",
        "description": "<p>This is the DIY challenge of the Container Services in AWS Cloud Quest.</p>\n\n<p></ol>",
        "summary": "<p>This is the DIY challenge of the Container Services in AWS Cloud Quest.</ol>",
        "date": "2023-03-08T21:57:48.000Z",
        "pubdate": "2023-03-08T21:57:48.000Z",
        "pubDate": "2023-03-08T21:57:48.000Z",
        "link": "https://dev.to/arc/aws-cloud-quest-container-services-1hi7",
        "guid": "https://dev.to/arc/aws-cloud-quest-container-services-1hi7",
        "author": "architec",
        "comments": null,
        "origlink": null,
        "image": {},
        "source": {},
        "categories": [
            "aws"
        ],
        "enclosures": [],
        "rss:@": {},
        "rss:title": {
            "@": {},
            "#": "AWS Cloud Quest: Container Services"
        },
        "dc:creator": {
            "@": {},
            "#": "architec"
        },
        "rss:pubdate": {
            "@": {},
            "#": "Wed, 08 Mar 2023 21:57:48 +0000"
        },
        "rss:link": {
            "@": {},
            "#": "https://dev.to/arc/aws-cloud-quest-container-services-1hi7"
        },
        "permalink": "https://dev.to/arc/aws-cloud-quest-container-services-1hi7",
        "rss:guid": {
            "@": {},
            "#": "https://dev.to/arc/aws-cloud-quest-container-services-1hi7"
        },
        "rss:description": {
            "@": {},
            "#": "<p>This is the DIY challenge of the Container Services in AWS Cloud Quest.</p>\n\n<p><a href=\"https://res.cloudinary.com/practicaldev/image/fetch/s--pZTG6rga--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/993bebzvmiomak17lm98.png\" class=\"article-body-image-wrapper\"><img src=\"https://res.cloudinary.com/practicaldev/image/fetch/s--pZTG6rga--/c_limit%2Cf_auto%2Cfl_progressive%2Cq_auto%2Cw_880/https://dev-to-uploads.s3.amazonaws.com/uploads/articles/993bebzvmiomak17lm98.png\" alt=\"Image description\" width=\"880\" height=\"419\"></a></p>\n\n<h3>\n  \n  \n  DIY Steps:\n</h3>\n\n<ol>\n<li>Repeat step 28-42</li>\n</ol>"
        },
        "rss:category": {
            "@": {},
            "#": "aws"
        },
        "meta": {
            "#ns": [
                {
                    "xmlns:atom": "http://www.w3.org/2005/Atom"
                },
                {
                    "xmlns:dc": "http://purl.org/dc/elements/1.1/"
                }
            ],
            "@": [
                {
                    "xmlns:atom": "http://www.w3.org/2005/Atom"
                },
                {
                    "xmlns:dc": "http://purl.org/dc/elements/1.1/"
                }
            ],
            "#xml": {
                "version": "1.0",
                "encoding": "UTF-8"
            },
            "#type": "rss",
            "#version": "2.0",
            "title": "DEV Community",
            "description": "The most recent home feed on DEV Community.",
            "date": null,
            "pubdate": null,
            "pubDate": null,
            "link": "https://dev.to/",
            "xmlurl": "https://dev.to/feed/",
            "xmlUrl": "https://dev.to/feed/",
            "author": null,
            "language": "en",
            "favicon": null,
            "copyright": null,
            "generator": null,
            "cloud": {},
            "image": {},
            "categories": [],
            "rss:@": {},
            "rss:title": {
                "@": {},
                "#": "DEV Community"
            },
            "rss:description": {
                "@": {},
                "#": "The most recent home feed on DEV Community."
            },
            "rss:link": {
                "@": {},
                "#": "https://dev.to/"
            },
            "atom:link": {
                "@": {
                    "rel": "self",
                    "type": "application/rss+xml",
                    "href": "https://dev.to/feed/"
                }
            },
            "rss:language": {
                "@": {},
                "#": "en"
            }
        }
    },
    props: {
        rss_feed_url: rssFeedUrl,
    },
    async onEnable({ propsValue, store }): Promise<void> {
        const items = await getRssItems(propsValue.rss_feed_url);
        await store.put('lastFetchedRssItem', getId(items?.[0]));
        return;
    },

    async onDisable(): Promise<void> {
        return;
    },

    async run({ propsValue, store }): Promise<unknown[]> {
        const items = await getRssItems(propsValue.rss_feed_url);
        const lastItemId = await store.get('lastFetchedRssItem');

        // Most RSS feeds observed return this XML schema and are usually sorted by date descending.
        // Relying on that to get the latest published item and determining if there are new items in the feed.
        // Support both RSS and Atom feeds.
        store.put('lastFetchedRssItem', getId(items?.[0]));

        const newItems = [];
        for (const item of items) {
            if (getId(item) === lastItemId) break;
            newItems.push(item);
        }

        return newItems;
    },
});

// Some RSS feeds use the id field, some use the guid field, and some use neither.
function getId(item: { id: string, guid: string }) {
    if (item === undefined) {
        return undefined;
    }
    if (item.guid) {
        return item.guid
    }
    if (item.id) {
        return item.id;
    }
    return JSON.stringify(item);
}


function getRssItems(url: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        axios.get(url, {
            responseType: 'stream',
        })
            .then((response) => {
                const feedparser = new FeedParser({
                    addmeta: true,
                });
                response.data.pipe(feedparser);
                const items: any[] = [];

                feedparser.on('readable', () => {
                    let item = feedparser.read();
                    while (item) {
                        items.push(item);
                        item = feedparser.read();
                    }
                });

                feedparser.on('end', () => {
                    resolve(items);
                });

                feedparser.on('error', (error: any) => {
                    reject(error);
                });
            })
            .catch((error) => {
                reject(error);
            });
    });
}