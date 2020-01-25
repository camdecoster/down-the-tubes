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

// Track blog URL entered by user
let searchName;

// Watch for events in DOM
function main() {
    console.log('`main` ran');

    // Watch for form submittals
    $('#js-search-form').submit(async function () {
        event.preventDefault();

        // Get the user entered information
        searchName = $('#js-search-name').val();
        const maxResults = $('#js-max-results').val();
        const platform = $('#js-platform').val();
        let sort = $('#js-sort-method').val();
        
        // Try to get post info to create results page
        try {
            // Hide intro, results, errors
            $('#js-search-results').addClass('hidden');
            $('#js-search-results-list').empty();
            $('#js-error-container').addClass('hidden');
            $('#js-error-message').empty();

            // Unhide loading container
            $('#js-intro-container').addClass('hidden');
            $('#js-loading-container').removeClass('hidden');
            
            // Get post content
            const posts = await getPosts(searchName, platform);

            // Get video ID's from posts
            let videoIds = parseYoutubeLinks(posts);

            // Show videos found
            displayResults(videoIds, maxResults, sort);
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
    $('#js-btn-stop').click(function () {
        continueSearch = false;
    })

    // Watch for new search link click
    $('#js-new-link').click(function () {
        event.preventDefault();
        resetView();
    });

    // Watch for Try Again button click after error
    $('#js-btn-error-reset').click(function () {
        event.preventDefault();
        resetView();
    })

    // Watch for title link clicks
    $('.title-link').click(function () {
        event.preventDefault();
        resetView();
    })

    // Watch for options button click
    $('#js-link-options').click(function () {
        const options = $('#js-link-options');
        event.preventDefault();
        
        // Change arrow to up/down if it's the opposite direction
        (options.text().slice(-1) === '▼') ? options.text('OPTIONS ▲') : options.text('OPTIONS ▼');
        $('#js-search-options').toggleClass('hidden');
    });
}

// Call selected site API to get post history for searchName. Calls platform
// specific function after determining which platform is used.
async function getPosts(searchName, platform) {
    console.log('`getPosts` ran')
    
    try {
        if (platform === 'blogger') {
            const posts = await getBloggerPosts(searchName);
            return posts;
        }
        else {
            throw new Error('Not a Blogger URL');
        }
    }
    catch (error) {
        throw error;
    }
}

// Get posts from Blogger blog
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
                posts.push(postsInfo.items[i]);
                $('#js-post-count').text(`Found ${posts.length} Posts`);
            }
            pageCount++;

            // If pageCount grows too high (from a blog with lots of posts), break loop
            if (pageCount > 500) { // This will get a max of 5000 posts
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

// Generate query string that concatenates all API parameters in proper format
function formatQueryParameters(queryParameters) {
    console.log('`formatQueryParameters` ran');

    const parameterString = Object.keys(queryParameters)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParameters[key])}`);
    return parameterString.join('&');
}

// Find all YouTube links in a post, return video ID's
function parseYoutubeLinks(posts) {
    console.log('`parseYoutubeLinks` ran');

    // There are different forms that this could take:
    // 1. http://www.youtube.com/v/5KOs70Su_8s&amp;hl=en&amp;fs=1
    // 2. https://www.youtube.com/watch?v=pMmn3vrCOx4
    // 3. https://www.youtube.com/embed/fGgfl71kfpE
    // 4. Shortened youtube URL's (FUTURE)

    const videoIds = [];    

    for (let i = 0; i < posts.length; i++) {
        const content = posts[i].content;
        let linkStart = 0;
        let searchPosition = 0;
        while (linkStart > -1) {
            // Search for YouTube URL in post
            linkStart = content.indexOf('youtube.com/', searchPosition);

            // Save first occurrence of YouTube URL to continue search after that point.
            // Some posts might have more than one URL.
            searchPosition = linkStart + 1;

            // Make sure post is long enough to hold shortest YouTube URL. If not, break loop.
            if (content.length < linkStart + 25) {
                break;
            }

            // If URL found, get video ID
            if (linkStart > -1) {
                let link = content.slice(linkStart + 12); // Chop off youtube.com/
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

                // Only add ID to list if it's not already in the list (no duplicates)
                if (!videoIds.find(item => item === link)) {
                    videoIds.push(link);
                }
            
            }
        }
    }

    return videoIds;
}

// Display results in DOM
async function displayResults(videoIds, maxResults, sort) {
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
        let videosSkipped = 0;

        // Use proper sort for videos
        if (sort === 'oldest-posts') {
            // Do nothing, videos are already sorted that way
        }
        else if (sort === 'newest-posts') {
            videoIds = videoIds.reverse();
        }
        
        // For each ID in videoIds, get info about video, add to list item;
        for (let i = 0; i < stopCount; i++) {
            // Get video info for each ID
            const videoInfo = await getVideoInfo(videoIds[i]);
            
            // Only display if video info is available
            if (videoInfo.title !== 'Video Unavailable') {
                // Add video info as list item
                list.append(`
                <li>
                    <a href="https://www.youtube.com/watch?v=${videoIds[i]}">${videoInfo.title}</a>
                    ${generateYoutubeEmbed(videoIds[i])}
                </li>`
                );
                videoCount++;
            }
            // If video is unavailable, remove ID from list, adjust counter variables accordingly
            else {
                videoIds.splice(i, 1);
                videosSkipped++;
                // Decrement stopCount so loop doesn't go on forever
                stopCount--;
                // Decrement i so ID's don't get skipped
                i--;
            }
        }

        // Display info on videos found, skipped
        $('#js-item-count').empty();
        $('#js-item-count').append(
            `${videoCount} videos found at:
            <br>
            <a href="${searchName}">${searchName}</a>`
        );
        if (videosSkipped > 0) {
            $('#js-item-count').append(
                `<br>
                ${videosSkipped} ${(videosSkipped > 1) ? 'videos were' : 'video was'} no longer available.`
            );
        }

        // Create playlist link
        $('#js-playlist-link').attr('href', generateYoutubePlaylist(videoIds));
    }
    // Otherwise state that no videos were found
    else {
        list.append('<li>No videos could be found at the blog you entered.</li>');
    }

    // Hide loading container, unhide results list
    $('#js-loading-container').addClass('hidden');
    $('#js-search-results').removeClass('hidden');
    

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

// Create youtube embed code, to be used for showing videos in the DOM
function generateYoutubeEmbed(videoId) {
    console.log('`generateYoutubeEmbed` ran');

    return `<iframe class="yt-video" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}

// Create link to youtube playlist of videos found
function generateYoutubePlaylist(videoIds) {
    // This method of generating a playlist will max out at 50 videos.
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

    return url;
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

// Reset the page to show the initial view, empty previous results
function resetView() {
    console.log('`resetView` ran');

    $('#js-intro-container').removeClass('hidden');
    $('#js-search-results').addClass('hidden');
    $('#js-search-results-list').empty();
    $('#js-error-container').addClass('hidden');
    $('#js-error-message').empty();
    $('#js-loading-container').addClass('hidden');
    $('#js-post-count').empty();
}

$(main());