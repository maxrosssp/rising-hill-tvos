//# sourceURL=application.js

const HILL_BASE_URL = 'https://thehill.com/hilltv/rising';
const PLAYER_BASE_URL = 'https://cdn.jwplayer.com/v2/playlists/';
const EPISODE_NAME_REGEX = '(\\d+)-rising-(january|february|march|april|may|june|july|august|september|october|november|december)-(\\d?\\d)-(\\d\\d\\d\\d)';

var lastPageNum = 0;
var episodes = {};

App.onLaunch = (options) => {
    const loadingScreen = createLoadingDocument();
    
    navigationDocument.pushDocument(loadingScreen);
    setEpisodes(episodes => {
        const playlistsDocument = createPlaylistsDocument(episodes);
        playlistsDocument.addEventListener('select', playSelectedEpisode);
        playlistsDocument.addEventListener('play', playSelectedEpisode);
        navigationDocument.replaceDocument(playlistsDocument, loadingScreen);
    });
};

const createLoadingDocument = () => new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <loadingTemplate>
                <activityIndicator>
                    <text>Please wait...</text>
                </activityIndicator>
            </loadingTemplate>
        </document>`, 'application/xml');

const getEndpoint = (url, onloadCallback) => {
    const templateXHR = new XMLHttpRequest();
    templateXHR.responseType = "document";
    templateXHR.addEventListener("load", () => onloadCallback(templateXHR.responseText), false);
    templateXHR.open("GET", url, true);
    templateXHR.send();
};

const setEpisodes = (callback, count = 10) => addEpisodesFromPage(lastPageNum, callback, count - Object.keys(episodes).length);

function addEpisodesFromPage(pageNum, callback, maxCountToAdd = 0) {
    getEndpoint(HILL_BASE_URL + (pageNum > 0 ? '?page=' + pageNum : ''), (responseText) => {
        lastPageNum = pageNum;
        
        const matchedEpisodes = Array.from(responseText.matchAll(EPISODE_NAME_REGEX)).reduce((episodeDict, match) => ({
            ...episodeDict,
            [match[2].charAt(0).toUpperCase() + match[2].slice(1) + ' ' + match[3] + ', ' + match[4]]: '/' + match[0]
        }), {});
        episodes = { ...episodes, ...matchedEpisodes };
        
        const remainingToAdd = maxCountToAdd - Object.keys(matchedEpisodes).length;
        if (remainingToAdd <= 0) {
            callback(Object.keys(episodes).map(title => ({ title, path: episodes[title] })).sort((a, b) => (a.path > b.path) ? -1 : 1));
        } else {
            addEpisodesFromPage(lastPageNum + 1, callback, remainingToAdd);
        }
    });
}

const createEpisodeElement = (episode) => `
        <lockup path="${episode.path}">
            <img src="https://thehill.com/sites/default/files/styles/thumb_opinion/public/rising_hill.tv_rising_krystal_saagar.png" width="250" height="376" />
            <title>${episode.title}</title>
        </lockup>
    `;

const createPlaylistsDocument =(episodes) => new DOMParser().parseFromString(`<?xml version="1.0" encoding="UTF-8" ?>
        <document>
            <catalogTemplate>
                <banner>
                    <title>Rising</title>
                </banner>
                <list>
                  <section>
                        <listItemLockup>
                            <title>Episodes</title>
                            <decorationLabel>${episodes.length}</decorationLabel>
                            <relatedContent>
                                <grid>
                                    <section>
                                        ${episodes.map(createEpisodeElement).join('')}
                                    </section>
                                </grid>
                            </relatedContent>
                        </listItemLockup>
                        <listItemLockup>
                            <title>Featured</title>
                            <decorationLabel>0</decorationLabel>
                            <relatedContent>
                                <grid>
                                    <section>
                                    </section>
                                </grid>
                            </relatedContent>
                        </listItemLockup>
                    </section>
                </list>
            </catalogTemplate>
        </document>
    `, 'application/xml');

const playSelectedEpisode = (event) => getEndpoint(HILL_BASE_URL + event.target.getAttribute('path'), (responseText) => {
        getEndpoint(PLAYER_BASE_URL + responseText.match('"playlist_id":"([a-zA-Z0-9]*)"')[1], (responseText2) => {
            const playlist = new Playlist();
            JSON.parse(responseText2).playlist.forEach(video => {
                const mediaItem = new MediaItem('video', video.sources[0].file);
                mediaItem.title = video.title;
                mediaItem.description = video.description;
                mediaItem.artworkImageURL = video.image;
                playlist.push(mediaItem);
            });
            const player = new Player();
            player.playlist = playlist;
            player.play();
        });
    });
