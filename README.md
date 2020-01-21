# Down The Tubes
Down The Tubes (DTT) is a web app designed to surface YouTube videos that a user posted some time ago on their Blogger blog. DTT works as follows:
1. User enters Blogger address and desired maximum results and clicks Find Videos button
2. Query the Blogger API to get the old post content
3. Check each post for YouTube links
4. Query the YouTube API for video information
5. Present the user with a page showing the old videos, along with a playlist link

In the event that the blog has many posts, getting all of the old post content can take some time. For this reason, a stop search button is included on the loading page. When clicked, the results up to that point will be presented.

[LAUNCH DOWN THE TUBES](https://camdecoster.github.io/down-the-tubes/)

DTT is written in HTML5, CSS3, and JavaScript (with jQuery).

DTT was created as part of the Bloc web developer curriculum.