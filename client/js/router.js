const Router = {
  routes: {
    '/': 'welcome',
    '/input': 'inputForm',
    '/results': 'results',
    '/bench': 'bench'
  },
  
  navigate(path) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute();
  },

  handleRoute() {
    let path = window.location.pathname;
    
    // For local dev without a real server fallback, we can use hash routing, but since we will run simple server, path is fine.
    // Let's support hash fallback just in case:
    if (window.location.hash) {
      path = window.location.hash.replace('#', '');
      window.history.replaceState({}, '', path);
    }
    
    if (!this.routes[path]) path = '/';
    
    const pageName = this.routes[path];
    const appContainer = document.getElementById('app');
    
    // Destroy previous page components if needed (e.g. charts)
    if (window.activePageDestructor) {
      window.activePageDestructor();
      window.activePageDestructor = null;
    }
    
    // Call page render
    if (pageName === 'welcome' && window.WelcomePage) {
      window.WelcomePage.render(appContainer);
    } else if (pageName === 'inputForm' && window.InputFormPage) {
      window.InputFormPage.render(appContainer);
    } else if (pageName === 'results' && window.ResultsPage) {
      window.ResultsPage.render(appContainer);
    } else if (pageName === 'bench' && window.BenchPage) {
      window.BenchPage.render(appContainer);
    } else {
      appContainer.innerHTML = `<h2>Page not found</h2><button onclick="Router.navigate('/')">Go Home</button>`;
    }
  }
};

window.addEventListener('popstate', () => Router.handleRoute());

// Wait for all scripts to load
window.addEventListener('DOMContentLoaded', () => {
  // Check if hash is used initially (e.g. file:///.../index.html#/input)
  if (window.location.hash) {
    const path = window.location.hash.replace('#', '');
    window.history.replaceState({}, '', path);
  }
  Router.handleRoute();
});
