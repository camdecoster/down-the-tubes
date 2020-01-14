'use strict';

// Twitter info
// const authUrl = 'https://api.twitter.com/oauth2/token';
// const apiUrl = 'https://api.twitter.com/1.1/statuses/user_timeline.json';
// const apiKey = 'eLctPKB8DKN4KbNHhB2Q94xhp';
// const apiSecretKey = 'IKh7hm1KUALKZs3tRCRr5P9m0ORdQiUIWA3i0Odgfp5BOXeTMO';

// const apiKey = 'xvz1evFS4wEEPTGEFPHBog';
// const apiSecretKey = 'L8qq9PZyRg6ieKGEKhZolGC0vJWLw8iEJ88DRdyOg';

// Blogger
const apiUrl = {
    blogger: {
        blogSearchUrl: 'https://www.googleapis.com/blogger/v3/blogs/byurl',
        postSearch: 'https://www.googleapis.com/blogger/v3/blogs/BLOGID/posts',
    },
    wordpress: {

    },
    youtube: {
        videoInfo: 'https://www.googleapis.com/youtube/v3/videos',
    }
};
const apiKey = {
    blogger: 'AIzaSyClUZftyAzopCHgsID010RIfK2d_9ntf9E',
    wordpress: '',
    youtube: 'AIzaSyClUZftyAzopCHgsID010RIfK2d_9ntf9E',
};

// Generate query string that concatenates all parameters in proper format
function formatQueryParameters(queryParameters) {
    console.log('`formatQueryParameters` ran');

    const parameterString = Object.keys(queryParameters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParameters[key])}`);
    // console.log('parameterString = ' + parameterString);
    return parameterString.join('&');
}

// Call selected site API to get post history for searchName
async function getPosts(searchName, platform) {
    console.log('`getPosts` ran')
    let posts;

    // Clear out previous error message
    $('#js-error-message').empty();

    // Hide results list
    $('#js-search-results').addClass('hidden');

    // Create parameters for API query
    const queryParameters = {};
    if (platform === 'blogger') {
        // queryParameters.url = searchName;
        // queryParameters.key = apiKeyBlogger;
        // apiUrl = apiUrlBlogger.url + apiUrlBlogger.blogSearch;
        posts = await getBloggerPosts(searchName);
    }
    else if (platform === 'wordpress') {
        
    }
    return posts;
}

// Get posts from Blogger blog
async function getBloggerPosts(searchName) {
    console.log('`getBloggerPosts` ran');

    // Will need to make repeated calls to API:
    // 1. Get blog ID from URL
    // 2. Get initial posts and nextPageToken
    // 3. Get next page until there is no more nextPageToken

    // NEED TO HANDLE NO POSTS FOUND
    
    let pageCount = 0;
    let postsInfo = {};
    const posts = [];
    
    const queryParametersBlogId = {
        url: searchName,
        key: apiKey.blogger,
    };
    let queryParametersPosts = {
        key: apiKey.blogger,
    };
    
    let apiUrlBlogger = apiUrl.blogger.blogSearchUrl;
    let parameterString = formatQueryParameters(queryParametersBlogId);

    // Create API call URL
    let url = apiUrlBlogger + '?' + parameterString;

    let response = await fetch(url);
    // let response = await getApiData({ url: searchName, key: apiKey.blogger }, apiUrl.blogger.blogSearchUrl);
    const blogInfo = await response.json();
    const blogId = await blogInfo.id;

    // With blog ID, the first page of posts can now be retrieved
    apiUrlBlogger = apiUrl.blogger.postSearch.replace('BLOGID', blogId);

    // Retrieve each set (page) of posts until there isn't another set
    while ("nextPageToken" in postsInfo || pageCount === 0) {
        // Only add nextPageToken if first page has been retrieved
        if (pageCount > 0) {
            queryParametersPosts.pageToken = postsInfo.nextPageToken;
            // console.log(postsInfo.nextPageToken);
        }
        parameterString = formatQueryParameters(queryParametersPosts);
        url = apiUrlBlogger + '?' + parameterString;
        // console.log(url);
        response = await fetch(url);
        postsInfo = await response.json();
        for (let i = 0; i < postsInfo.items.length; i++) {
            posts.push(postsInfo.items[i].content);
        }
        pageCount++;
        if (pageCount > 100) {
            break;
        }
    }
    return posts;

    
}

async function getApiData(queryParameters, siteUrl) {
    let parameterString = formatQueryParameters(queryParameters);
    // Create API call URL
    let url = siteUrl + '?' + parameterString;

    return response = await fetch(url);
}

// Get posts from Wordpress blog
async function getWordpressPosts(searchName) {
    console.log('`getWordpressPosts` ran');
}

// Find all youtube links in a post, return video ID's
function parseYoutubeLinks(posts) {
    console.log('`parseYoutubeLinks` ran');

    // There are different forms that this could take:
    // 1. http://www.youtube.com/v/5KOs70Su_8s&amp;hl=en&amp;fs=1
    // 2. https://www.youtube.com/watch?v=pMmn3vrCOx4
    // 3. Shortened youtube URL's > use curl?

    // NEED TO REMOVE DUPLICATE VIDEOS
    // NEED TO HANDLE POSTS WITH MULTIPLE VIDEOS (try .indexOf())

    const videoIds = [];

    for (let i = 0; i < posts.length; i++){
        // NEED TO ADD URI DECODING
        let linkStart = posts[i].search('youtube.com/');
        
        if (linkStart > -1) {
            let link = posts[i].slice(linkStart + 12); // Chop off youtube.com/
            // Check for youtube links of the format:
            // http://www.youtube.com/v/5KOs70Su_8s
            if (link[0] === 'v') {
                link = link.slice(2, 13); // Chop off 'v/', end after video ID
                console.log(link);
                videoIds.push(link);
            }
            // If not above format, then assume following format:
            // https://www.youtube.com/watch?v=pMmn3vrCOx4
            else {
                link = link.slice(8, 19); // Chop off 'watch?v=', end after video ID
                console.log(link);
                videoIds.push(link);
                //return posts[i].slice(linkStart + 31, linkStart + 42);
            }
            
        }
    }
    console.log('videoIds = ' + videoIds);
    return videoIds;
}

// Get details about video like title, upload date, etc.
async function getVideoInfo(videoId) {
    console.log('`getVideoInfo` ran');

    const queryParameters = {
        part: 'snippet',
        id: videoId,
        key: apiKey.youtube,
    };

    const parameterString = formatQueryParameters(queryParameters);

    // Create API call URL
    const url = apiUrl.youtube.videoInfo + '?' + parameterString;
    
    try {
        const response = await fetch(url);
        const videoInfo = await response.json();
        const videoTitle = videoInfo.items[0].snippet.title;
        const videoDesc = videoInfo.items[0].snippet.description;
        const videoThumbUrl = videoInfo.items[0].snippet.thumbnails.high.url;

        return {
            title: videoTitle,
            desc: videoDesc,
            thumbUrl: videoThumbUrl,
        };
    }
    catch {
        return {
            title: 'Video Unavailable',
        }
    }
}

// Display results in DOM
async function displayResults(videoIds) {
    console.log('`displayResults` ran');

    // Grab the list container
    const list = $('#js-search-results-list');

    // Clear out previous results
    list.empty();

    // Only add videos if youtube links were found
    if (videoIds.length > 0) {
        $('#js-item-count').text(`${videoIds.length} Videos Found`);
        // For each ID in videoIds, get info about video, add to list item;
        for (let i = 0; i < videoIds.length; i++) {
            // Find address index for physical address if address exists
            const videoInfo = await getVideoInfo(videoIds[i]);
            if (videoInfo.title !== 'Video Unavailable') {
                console.log(videoInfo);
            
                // Add park info as list item
                list.append(`
                <li>
                    ${generateYoutubeEmbed(videoIds[i])}
                    <br>
                    ${videoInfo.title}
                    <br>
                    <br>
                    ${videoInfo.desc}
                    <br>
                    <br>
                    <a href="https://www.youtube.com/watch?v=${videoIds[i]}">https://www.youtube.com/watch?v=${videoIds[i]}</a>
                    <br>
                    <br>
                </li>`
                );
            }
        }
    }
    // Otherwise state that no videos were found
    else {
        list.append('<li>No videos could be found at the blog you entered.</li>');
    }
    // Change classes to display results list
    $('#js-search-results').removeClass('hidden'); 

}

// Create youtube embed code, to be used for showing videos in the DOM
function generateYoutubeEmbed(videoId) {
    console.log('`generateYoutubeEmbed` ran');

    return `<iframe class="yt-video" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

// Watch for form submittals
function watchForm() {
    console.log('`watchForm` ran');
    $('#js-search-form').submit(async function () {
        event.preventDefault();

        const searchName = $('#js-search-name').val();
        const platform = $('#js-platform').val();
        //console.log(platform, platform === 'Blogger');
        
        const posts = await getPosts(searchName, platform);
        // console.log(posts);
        const videoIds = parseYoutubeLinks(posts);
        // console.log(videoIds);
        displayResults(videoIds);
        
    })
}

$(watchForm());