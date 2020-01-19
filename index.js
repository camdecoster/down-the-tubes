'use strict';

// Declare information to access relevant API's
const apiInfo = {
    blogger: {
        key: 'AIzaSyClUZftyAzopCHgsID010RIfK2d_9ntf9E',
        url: {
            blogSearch: 'https://www.googleapis.com/blogger/v3/blogs/byurl',
            postSearch: 'https://www.googleapis.com/blogger/v3/blogs/BLOGID/posts',
        }
    },
    youtube: {
        key: 'AIzaSyClUZftyAzopCHgsID010RIfK2d_9ntf9E',
        url: {
            videoInfo: 'https://www.googleapis.com/youtube/v3/videos',
        }
    }
}

// Only search for posts if this is true. User can stop search if they click
// the stop search button.
let continueSearch = true;

// Generate query string that concatenates all API parameters in proper format
function formatQueryParameters(queryParameters) {
    console.log('`formatQueryParameters` ran');

    const parameterString = Object.keys(queryParameters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParameters[key])}`);
    // console.log('parameterString = ' + parameterString);
    return parameterString.join('&');
}

// Call selected site API to get post history for searchName. Calls platform
// specific function after determining which platform is used.
async function getPosts(searchName) {
    console.log('`getPosts` ran')

    
    try {
        // CONSIDER ADDING HTTPS IF USER FORGETS
        if (searchName.search('blogger') > -1 || searchName.search('blogspot') > -1) {            
            const posts = await getBloggerPosts(searchName);
            return posts;
        }
        // else if (searchName.search('tumblr') > -1) {
        //     // Add logic for tumblr blogs
        // }
        // else if (searchName.search('wordpress.com') > -1) {
        //     // Add logic for Wordpress blogs
        // }
        else {
            throw new Error('Not a Blogger URL');
        }
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
    
    // Track how many pages followed on blog to add pageToken at correct time,
    // end search after meeting threshold
    let pageCount = 0;

    // Create container for API response with info for up to 10 posts
    let postsInfo = {};

    // Create container for content taken from each post
    const posts = [];
    
    // Define API query parameters for getting blog ID, posts
    const queryParameters = {
        blogId: {
            key: apiInfo.blogger.key,
            url: searchName,            
        },
        posts: {
            key: apiInfo.blogger.key,
            fields: 'nextPageToken,items(published,content)',
        },
    };

    try {
        // Get blog ID from API
        let response = await getApiData(queryParameters.blogId, apiInfo.blogger.url.blogSearch);
        const blogInfo = await response.json();
        const blogId = blogInfo.id;

        // Retrieve each set (page) of posts until there isn't another set
        // or until user clicks the stop search button
        while (("nextPageToken" in postsInfo || pageCount === 0) && continueSearch === true) {
            // Only add nextPageToken to query parameters if first page has been retrieved
            if (pageCount > 0) {
                queryParameters.posts.pageToken = postsInfo.nextPageToken;
            }
            
            // Get posts from blog (using blog ID as part of query URL)
            response = await getApiData(queryParameters.posts, apiInfo.blogger.url.postSearch.replace('BLOGID', blogId));
            postsInfo = await response.json();

            // Go through each post returned in postsInfo, get content and save it
            for (let i = 0; i < postsInfo.items.length; i++) {
                posts.push(postsInfo.items[i].content);
                $('#js-post-count').text(`Found ${posts.length} Posts`);
            }
            pageCount++;

            // If pageCount grows too high (from a blog with lots of posts), break loop
            if (pageCount > 100) {
                break;
            }
        }

        // Enable future searches in case stop button was clicked
        continueSearch = true;

        // Return oldest posts by default        
        return posts.reverse();
    }
    catch(error) {
        throw error;
    }    
}

// Create API query URL, then fetch data from API
async function getApiData(queryParameters, siteUrl) {
    console.log('`getApiData` ran');

    // Create API query URL for getting blog ID
    let parameterString = formatQueryParameters(queryParameters);
    let url = siteUrl + '?' + parameterString;
    try {
        // Get info from API
        const response = await fetch(url);
        // Make sure response is OK before proceeding
        if (!response.ok) {
            throw new Error(response.status);
        }
        return response;
    }
    catch(error) {
        throw (error);
    }
}

// Get posts from Wordpress blog (FUTURE)
async function getWordpressPosts(searchName) {
    console.log('`getWordpressPosts` ran');
}

// Find all YouTube links in a post, return video ID's
function parseYoutubeLinks(posts) {
    console.log('`parseYoutubeLinks` ran');

    // There are different forms that this could take:
    // 1. http://www.youtube.com/v/5KOs70Su_8s&amp;hl=en&amp;fs=1
    // 2. https://www.youtube.com/watch?v=pMmn3vrCOx4
    // 3. https://www.youtube.com/embed/fGgfl71kfpE
    // 4. Shortened youtube URL's > use curl?

    const videoIds = [];
    //const search = true;
    

    for (let i = 0; i < posts.length; i++) {
        // ADD URI DECODING?
        let linkStart = 0;
        let searchPosition = 0;
        while (linkStart > -1) {
            // Search for YouTube URL in post
            linkStart = posts[i].indexOf('youtube.com/', searchPosition);

            // Save first occurrence of YouTube URL to continue search after that point.
            // Some posts might have more than one URL.
            searchPosition = linkStart + 1;

            // Make sure post is long enough to hold shortest YouTube URL. If not, break loop.
            if (posts[i].length < linkStart + 25) {
                break;
            }

            // If URL found, get video ID
            if (linkStart > -1) {
                let link = posts[i].slice(linkStart + 12); // Chop off youtube.com/
                // Check for youtube links of the format:
                // http://www.youtube.com/v/5KOs70Su_8s
                if (link[0] === 'v') {
                    link = link.slice(2, 13); // Chop off 'v/', end after video ID
                    console.log(link);
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

                // Only add ID to list if it's not already in the list (no duplicates)
                if (!videoIds.find(item => item === link)) {
                    videoIds.push(link);
                }
            
            }
        }
    }

    console.log('videoIds = ' + videoIds);
    return videoIds;
}

// Get details about video like title, upload date, etc.
async function getVideoInfo(videoId) {
    console.log('`getVideoInfo` ran');

    // Create parameters for API query
    const queryParameters = {
        key: apiInfo.youtube.key,
        part: 'snippet',
        id: videoId,
    };
    
    try {
        // Get video info from YouTube API
        const response = await getApiData(queryParameters, apiInfo.youtube.url.videoInfo);
        const videoInfo = await response.json();

        // Get relevant info about video
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

// Create link to youtube playlist of videos found
function generateYoutubePlaylist(videoIds) {
    console.log('`generateYoutubePlaylist` ran');

    const ytUrl = 'https://www.youtube.com/watch_videos';
    const options = {
        redirect: 'manual',
    }
    const queryParameters = {
        video_ids: videoIds.join(','),
    }
    const parameterString = formatQueryParameters(queryParameters);
    const url = ytUrl + '?' + parameterString;
    // Is there a way to get the redirect URL from fetch() without following?

    // const response = await fetch(url, options);
    // console.log(response);
    // const playlistUrl = await response.json();
    return url;
}

// Create youtube embed code, to be used for showing videos in the DOM
function generateYoutubeEmbed(videoId) {
    console.log('`generateYoutubeEmbed` ran');

    return `<iframe class="yt-video" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

// Reset the page to show the initial view, empty previous results
function resetView() {
    console.log('`resetView` ran');

    $('#js-search-name').val('');
    $('#js-max-results').val('10');
    $('#js-search-container').removeClass('hidden');
    $('#js-footer').addClass('hidden');
    $('#js-search-results').addClass('hidden');
    $('#js-search-results-list').empty();
    $('#js-error-container').addClass('hidden');
    $('#js-error-message').empty();
    $('#js-loading-container').addClass('hidden');
    $('#js-post-count').empty();
}

// Check errors and return the appropriate info
function errorCheck(error) {
    console.log('`errorCheck` ran');
    
    if (error.message === "404" || error.message === "400") {
        return "Blog could not be found.";
    }
    else {
        return error.message;
    }
}

// Watch for events in DOM
function main() {
    console.log('`main` ran');

    // Watch for form submittals
    $('#js-search-form').submit(async function () {
        event.preventDefault();

        // Get the blog name and desired max results that user entered
        const searchName = $('#js-search-name').val();
        const maxResults = $('#js-max-results').val();
        // const platform = $('#js-platform').val();
        
        // Try to get post info to create results page
        try {
            // Hide search form, unhide loading container
            $('#js-search-container').addClass('hidden');
            $('#js-loading-container').removeClass('hidden');

            // Get post content
            const posts = await getPosts(searchName);

            // Get video ID's from posts
            let videoIds = parseYoutubeLinks(posts);

            // Show videos found
            displayResults(videoIds, maxResults);
        }
        // If API call failed, show error to user
        catch (error) { 
            const errorInfo = errorCheck(error);
            $('#js-loading-container').addClass('hidden');
            $('#js-error-message').text(`${errorInfo}`);
            $('#js-error-container').removeClass('hidden');
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