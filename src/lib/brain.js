// Wordpress Admin Bar Control - Manifest V3 version

const wpAdminHide = {
  /**
   * Adds a domain name to Chrome storage
   */
  addD: function(domain) {
    let obj = {};
    obj[domain] = true;
    chrome.storage.sync.set(obj, function(){
        // console.log(domain + "added to storage, admin bar removed.");
    });
  },

  /**
   * Removes a domain from Chrome storage
   */
  remD: function(domain) {
    chrome.storage.sync.remove(domain, function(){
        // console.log(domain + "removed to storage, admin bar restored.");
    });
  },

  /**
   * Checks for the existence of a Chrome storage item that matches the domain
   * Second and third arguments are callbacks for match/no match
   */
  chkD: function(tabId, yes, no) {
    chrome.tabs.get(tabId, function(tab) {
      if (tab.url.startsWith("chrome")) {
        console.error("Can't run on Chrome pages, sorry :(");
        return;
      }
      let domain = tab.url.split("/")[2];
      chrome.storage.sync.get(domain, function(result) {
        result[domain] ? yes(domain) : no(domain);
      });
    });
  },

  /**
   * Hides the WP admin bar on the current tab
   */
  removeBar: function(tabId) {
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: () => {
        const bar = document.getElementById('wpadminbar');
        if (bar) bar.style.display = 'none';
        document.getElementsByTagName('html')[0].style.setProperty('margin-top', '0px', 'important');
        document.getElementsByTagName('html')[0].style.setProperty('padding-top', '0px', 'important');
        document.getElementsByTagName('body')[0].classList.remove('admin-bar');
      },
      world: "MAIN"
    }, () => {
      wpAdminHide.toggleIcon(true);
    });
  },

  /**
   * Restores the WP admin bar on the current tab
   */
  restoreBar: function(tabId) {
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: () => {
        const bar = document.getElementById('wpadminbar');
        if (bar) bar.removeAttribute('style');
        document.getElementsByTagName('html')[0].removeAttribute('style');
        document.getElementsByTagName('body')[0].classList.add('admin-bar');
      },
      world: "MAIN"
    }, () => {
      wpAdminHide.toggleIcon(false);
    });
  },

  /**
   * Updates the extension icon to indicate state
   */
  toggleIcon: function(isHidden) {
    chrome.action.setIcon({
      path: isHidden
        ? { 19: "/img/icon19_1.png", 38: "/img/icon38_1.png" }
        : { 19: "/img/icon19_0.png", 38: "/img/icon38_0.png" },
    });
  }
};

/* 
 * Listener for browser action button clickage. Checks the active tab against Chrome storage
 * and toggles the state of the plugin accordingly.
 */
chrome.action.onClicked.addListener((tab) => {
  wpAdminHide.chkD(
    tab.id,
    function(domain) {
      wpAdminHide.remD(domain);
      wpAdminHide.restoreBar(tab.id);
    },
    function(domain) {
      wpAdminHide.addD(domain);
      wpAdminHide.removeBar(tab.id);
    }
  );
});

/*
 * Keep the icon up to date based on whether or not the domain exists in local storage.
 * Going to assume that the hiding was handled on tab load so this is just for keeping up
 * appearances.
 */
function updateBrowserIcon(tab) {
  const tabId = tab.tabId || tab.id;
  wpAdminHide.chkD(
    tabId,
    function() { wpAdminHide.toggleIcon(true); },
    function() { wpAdminHide.toggleIcon(false); }
  );
}

/**
 * Update icon when tab is changed within a single window
 */
chrome.tabs.onActivated.addListener(updateBrowserIcon);

/**
 * Update icon when window focus changes
 */
chrome.windows.onFocusChanged.addListener(function(windowId) {
  chrome.tabs.query({ windowId: windowId, active: true }, function(tabs) {
    if (tabs && tabs[0]) updateBrowserIcon(tabs[0]);
  });
});

/**
 * This listener fires each time the user loads a new page. If the domain is recognized
 * then the bar removal script is fired.
 */
chrome.tabs.onUpdated.addListener(function(tabId) {
  wpAdminHide.chkD(
    tabId,
    function() { wpAdminHide.removeBar(tabId); },
    function() {}
  );
});