'use strict';

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

let continueSearch = true;

// Generate query string that concatenates all parameters in proper format
function formatQueryParameters(queryParameters) {
    console.log('`formatQueryParameters` ran');

    const parameterString = Object.keys(queryParameters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParameters[key])}`);
    // console.log('parameterString = ' + parameterString);
    return parameterString.join('&');
}

// Call selected site API to get post history for searchName
async function getPosts(searchName) {
    console.log('`getPosts` ran')
    let posts;

    // Clear out previous error message
    $('#js-error-message').empty();

    // Hide results list
    $('#js-search-results').addClass('hidden');

    try {
        // Create parameters for API query
        const queryParameters = {};
        if (searchName.search('blogger') > -1 || searchName.search('blogspot') > -1) {
            // queryParameters.url = searchName;
            // queryParameters.key = apiKeyBlogger;
            // apiUrl = apiUrlBlogger.url + apiUrlBlogger.blogSearch;
            posts = await getBloggerPosts(searchName);
        }
        else if (searchName.search('wordpress.com') > -1) {
        
        }
        return posts;
    }
    catch (error) {
        throw error;
    }
}

// Get posts from Blogger blog
// CURRENTLY STOPS AFTER 100 POSTS FOUND
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
    const queryParametersPosts = {
        key: apiKey.blogger,
        fields: 'nextPageToken,items(published,content)',
    };
    
    let apiUrlBlogger = apiUrl.blogger.blogSearchUrl;
    let parameterString = formatQueryParameters(queryParametersBlogId);

    // Create API call URL
    let url = apiUrlBlogger + '?' + parameterString;

    try {
        let response = await fetch(url);
        // let response = await getApiData({ url: searchName, key: apiKey.blogger }, apiUrl.blogger.blogSearchUrl);
        const blogInfo = await response.json();
        const blogId = await blogInfo.id;

        // With blog ID, the first page of posts can now be retrieved
        apiUrlBlogger = apiUrl.blogger.postSearch.replace('BLOGID', blogId);

        // Retrieve each set (page) of posts until there isn't another set
        while (("nextPageToken" in postsInfo || pageCount === 0) && continueSearch === true) {
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
                $('#js-post-count').text(`Found ${posts.length} Posts`);
            }
            pageCount++;
            if (pageCount > 100) {
                break;
            }
        }

        // Enable future searches in case stop button was clicked
        continueSearch = true;

        // Clear videos found
        $('#js-post-count').empty();

        // Return oldest posts by default        
        return posts.reverse();
    }
    catch(error) {
        throw error;
    }    
}

// async function getApiData(queryParameters, siteUrl) {
//     let parameterString = formatQueryParameters(queryParameters);
//     // Create API call URL
//     let url = siteUrl + '?' + parameterString;

//     return response = await fetch(url);
// }

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
    // 3. https://www.youtube.com/embed/fGgfl71kfpE
    // 4. Shortened youtube URL's > use curl?

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
            }
            // If not above format, then assume following format:
            // https://www.youtube.com/watch?v=pMmn3vrCOx4
            else if (link[0] === 'w') {
                link = link.slice(8, 19); // Chop off 'watch?v=', end after video ID
            }
            // If not above formats, then assume following format:
            // https://www.youtube.com/embed/fGgfl71kfpE
            else if (link[0] === 'e') {
                link = link.slice(6, 17); // Chop off 'embed/', end after video ID
            }

            // Only add ID to list if it's not already in the list
            if (!videoIds.find(item => item === link)) {
                videoIds.push(link);
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
async function displayResults(videoIds, maxResults) {
    console.log('`displayResults` ran');

    // Grab the list container
    const list = $('#js-search-results-list');

    // Clear out previous results
    list.empty();

    // Only add videos if youtube links were found
    if (videoIds.length > 0) {
        // Stop going through ID's once max results listed
        let stopCount = (videoIds.length > maxResults) ? maxResults : videoIds.length;
        let videoCount = 0;
        //console.log('stopCount = ' + stopCount);
        
        // For each ID in videoIds, get info about video, add to list item;
        for (let i = 0; i < stopCount; i++) {
            // Get video info for each ID
            const videoInfo = await getVideoInfo(videoIds[i]);
            console.log('Title is ' + videoInfo.title);
            // Only display if video info is available
            if (videoInfo.title !== 'Video Unavailable') {
                console.log(videoInfo);
            
                // Add video info as list item
                list.append(`
                <li>
                    ${generateYoutubeEmbed(videoIds[i])}
                    <br>
                    ${videoInfo.title}
                    <br>
                    <br>                    
                    <a href="https://www.youtube.com/watch?v=${videoIds[i]}">https://www.youtube.com/watch?v=${videoIds[i]}</a>
                    <br>
                    <br>
                </li>`
                );
                videoCount++;
            }
            // If video is unavailable, remove ID from list, adjust counter variables accordingly
            else {
                videoIds.splice(i, 1);
                // Decrement stopCount so loop doesn't go on forever
                stopCount--;
                // Decrement i so ID's don't get skipped
                i--;
            }
        }
        $('#js-item-count').text(`${videoCount} Videos Found`);

        // Create playlist link
        $('#js-playlist-link').attr('href', generateYoutubePlaylist(videoIds));
    }
    // Otherwise state that no videos were found
    else {
        list.append('<li>No videos could be found at the blog you entered.</li>');
    }

    // Hide loading container, unhide results list, footer
    $('#js-loading-container').addClass('hidden');
    $('#js-footer').removeClass('hidden');
    $('#js-search-results').removeClass('hidden');
    

}

// Create youtube embed code, to be used for showing videos in the DOM
function generateYoutubeEmbed(videoId) {
    console.log('`generateYoutubeEmbed` ran');

    return `<iframe class="yt-video" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

function generateYoutubePlaylist(videoIds){
    const ytUrl = 'https://www.youtube.com/watch_videos';
    const options = {
        redirect: 'manual',
    }
    const queryParameters = {
        video_ids: videoIds.join(','),
    }
    const parameterString = formatQueryParameters(queryParameters);
    const url = ytUrl + '?' + parameterString;
    // const response = await fetch(url, options);
    // console.log(response);
    // const playlistUrl = await response.json();
    return url;
}

// Reset the page to show the initial view
function resetView() {
    console.log('`resetView` ran');

    $('#js-search-name').val('');
    $('#js-max-results').val('10');
    $('#js-search-container').removeClass('hidden');
    $('#js-footer').addClass('hidden');
    $('#js-search-results').addClass('hidden');
    $('#js-error-container').addClass('hidden');
    $('#js-loading-container').addClass('hidden');

}

// Watch for events in DOM
function main() {
    console.log('`main` ran');

    // Watch for form submittals
    $('#js-search-form').submit(async function () {
        event.preventDefault();

        const searchName = $('#js-search-name').val();
        const maxResults = $('#js-max-results').val();
        // const platform = $('#js-platform').val();
        
        try {
            // Hide search form, unhide loading container
            $('#js-search-container').addClass('hidden');
            $('#js-loading-container').removeClass('hidden');

            const posts = await getPosts(searchName);
            let videoIds = parseYoutubeLinks(posts);
        
            // Reduce to list to maxResults length if necessary
            // if (videoIds.length > maxResults) {
            //     videoIds = videoIds.slice(0, maxResults);
            //     console.log(videoIds);
            // }

            // Show videos found
            displayResults(videoIds, maxResults);
        }
        catch (error) {            
            $('#js-error-message').text(`There was an error: ${error.message}`);
            $('#js-error-container').removeClass('hidden');
            console.log(error);
        }
    });

    // Watch for stop search button click
    $('#js-stop-button').click(function () {
        continueSearch = false;
    })

    // Watch for link clicks
    $('#js-new-link').click(function () {
        event.preventDefault();
        resetView();
    });

    $('#js-error-reset-link').click(function () {
        event.preventDefault();
        resetView();
    })
}

$(main());