// Ce fichier contient le code nécessaire pour intégrer Contentful à votre blog

// Configuration de Contentful
const contentfulConfig = {
    space: 'fw6uaxnqrkg1', // Votre ID d'espace Contentful
    accessToken: 'xc2wkpOlJKibvbbyhaUbyrYuJa1krU5Oh_7IJOMkigo', // Votre token d'accès
  };
  
  // Classe pour gérer les appels à l'API Contentful
  class ContentfulClient {
    constructor(config) {
      this.spaceId = config.space;
      this.accessToken = config.accessToken;
      this.baseUrl = `https://cdn.contentful.com/spaces/${this.spaceId}`;
    }
  
    // Récupère tous les articles
    async getAllArticles() {
      try {
        // D'abord, essayons de récupérer sans spécifier de type de contenu
        const response = await fetch(
          `${this.baseUrl}/entries?access_token=${this.accessToken}`
        );
        
        if (!response.ok) {
          console.error("Erreur HTTP lors de la récupération des articles:", response.status);
          throw new Error('Erreur lors de la récupération des articles');
        }
        
        const data = await response.json();
        console.log("Articles récupérés avec succès");
        return this.processArticlesResponse(data);
      } catch (error) {
        console.error('Erreur:', error);
        return [];
      }
    }
  
    // Récupère un article spécifique par son ID
    async getArticleById(articleId) {
      try {
        const response = await fetch(
          `${this.baseUrl}/entries/${articleId}?access_token=${this.accessToken}`
        );
        
        if (!response.ok) {
          console.error("Erreur HTTP lors de la récupération de l'article:", response.status);
          throw new Error('Article non trouvé');
        }
        
        const data = await response.json();
        return this.processArticleResponse(data);
      } catch (error) {
        console.error('Erreur:', error);
        return null;
      }
    }
  
    // Traite la réponse de plusieurs articles
    processArticlesResponse(data) {
      // Vérifier si nous avons des articles
      if (!data.items || data.items.length === 0) {
        console.log("Aucun article trouvé");
        return [];
      }
  
      // Créer un map des assets pour un accès facile
      const assets = {};
      if (data.includes && data.includes.Asset) {
        data.includes.Asset.forEach(asset => {
          assets[asset.sys.id] = asset.fields;
        });
      }
  
      // Transformer les entrées en format plus utilisable
      return data.items.map(item => {
        const article = item.fields;
        
        // Résoudre l'URL de l'image principale
        if (article.mainImage && article.mainImage.sys) {
          const imageId = article.mainImage.sys.id;
          if (assets[imageId]) {
            article.mainImageUrl = `https:${assets[imageId].file.url}`;
          }
        }
        
        // Ajouter l'ID de l'article pour référence
        article.id = item.sys.id;
        article.createdAt = new Date(item.sys.createdAt);
        
        return article;
      });
    }
  
    // Traite la réponse d'un seul article
    processArticleResponse(data) {
      // Pour un seul article, le traitement est similaire mais avec une structure différente
      const article = data.fields;
      article.id = data.sys.id;
      article.createdAt = new Date(data.sys.createdAt);
      
      // Vérifier les includes pour résoudre les assets (images)
      if (data.includes && data.includes.Asset) {
        // Si l'article a une image principale
        if (article.mainImage && article.mainImage.sys) {
          const mainImageId = article.mainImage.sys.id;
          const mainImageAsset = data.includes.Asset.find(asset => asset.sys.id === mainImageId);
          
          if (mainImageAsset) {
            article.mainImageUrl = `https:${mainImageAsset.fields.file.url}`;
          }
        }
        
        // Si l'article a une image d'auteur
        if (article.authorImage && article.authorImage.sys) {
          const authorImageId = article.authorImage.sys.id;
          const authorImageAsset = data.includes.Asset.find(asset => asset.sys.id === authorImageId);
          
          if (authorImageAsset) {
            article.authorImageUrl = `https:${authorImageAsset.fields.file.url}`;
          }
        }
      }
      
      return article;
    }
  }
  
  // Initialisation du client Contentful
  const contentfulClient = new ContentfulClient(contentfulConfig);
  
  // Fonction pour charger les articles sur la page d'accueil
  async function loadArticlesPreview() {
    const articlesContainer = document.getElementById('articles-container');
    if (!articlesContainer) return;
    
    // Afficher un loader
    articlesContainer.innerHTML = `
      <div class="flex justify-center w-full col-span-full">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-field"></div>
      </div>
    `;
    
    try {
      const articles = await contentfulClient.getAllArticles();
      
      if (articles.length === 0) {
        articlesContainer.innerHTML = '<p class="text-center text-gray-500">Aucun article disponible pour le moment.</p>';
        return;
      }
      
      let html = '';
      
      articles.slice(0, 6).forEach(article => {
        html += `
          <div class="article-card bg-white rounded-lg shadow-lg overflow-hidden">
            <img src="${article.mainImageUrl || 'placeholder-article.jpg'}" alt="${article.title || 'Article sans titre'}" class="w-full h-48 object-cover">
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-field mb-2">${article.title || 'Article sans titre'}</h3>
              <p class="text-gray-600 mb-4">${article.excerpt || 'Aucun résumé disponible'}</p>
              <a href="article.html?id=${article.id}" class="text-green-field font-medium flex items-center">
                Lire l'article
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        `;
      });
      
      articlesContainer.innerHTML = html;
    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
      articlesContainer.innerHTML = '<p class="text-center text-red-500">Une erreur est survenue lors du chargement des articles. Veuillez vérifier la console pour plus de détails.</p>';
    }
  }
  
  // Fonction pour charger un article spécifique sur la page d'article
  async function loadSingleArticle() {
    const articleContainer = document.getElementById('article-container');
    if (!articleContainer) return;
    
    // Récupérer l'ID de l'article depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    
    if (!articleId) {
      articleContainer.innerHTML = '<p class="text-center text-red-500">Identifiant d\'article manquant</p>';
      return;
    }
    
    // Afficher un loader
    articleContainer.innerHTML = `
      <div class="flex justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-field"></div>
      </div>
    `;
    
    try {
      const article = await contentfulClient.getArticleById(articleId);
      
      if (!article) {
        articleContainer.innerHTML = '<p class="text-center text-red-500">Article non trouvé</p>';
        return;
      }
      
      // Formater la date
      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(article.createdAt);
      
      // Mettre à jour le titre de la page
      document.title = `${article.title || 'Article'} - Gestes Techniques Football`;
      
      // Générer le HTML de l'article
      articleContainer.innerHTML = `
        <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <img src="${article.mainImageUrl || 'placeholder-article-large.jpg'}" alt="${article.title || 'Article sans titre'}" class="w-full h-64 object-cover">
          <div class="p-8">
            <h1 class="text-3xl font-bold text-green-field mb-4">${article.title || 'Article sans titre'}</h1>
            
            <div class="flex items-center text-gray-600 mb-6">
              <span class="mr-4">${formattedDate}</span>
              <span class="px-2 py-1 bg-green-field text-white text-xs rounded-full">${article.category || 'Non catégorisé'}</span>
            </div>
            
            <div class="prose max-w-none article-content">
              ${renderRichText(article.content)}
            </div>
            
            <div class="mt-8 pt-6 border-t border-gray-200">
              <div class="flex justify-between items-center">
                <div class="flex items-center">
                  <img src="${article.authorImageUrl || 'author-placeholder.jpg'}" alt="${article.author || 'Auteur'}" class="w-10 h-10 rounded-full mr-3">
                  <span class="font-medium">${article.author || 'Auteur'}</span>
                </div>
                <div class="flex space-x-4">
                  <a href="#" class="flex items-center text-green-field">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Partager
                  </a>
                  <a href="#" class="flex items-center text-green-field">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Sauvegarder
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Erreur lors du chargement de l\'article:', error);
      articleContainer.innerHTML = '<p class="text-center text-red-500">Une erreur est survenue lors du chargement de l\'article.</p>';
    }
  }
  
  // Fonction améliorée pour rendre le texte riche de Contentful
  function renderRichText(content) {
    if (!content) {
      return '<p>Aucun contenu disponible</p>';
    }
    
    if (typeof content === 'object' && content.content) {
      // Si vous utilisez le Rich Text de Contentful
      return content.content.map(node => {
        if (node.nodeType === 'paragraph') {
          return `<p>${node.content.map(textNode => {
            // Gérer le texte avec mise en forme
            if (textNode.nodeType === 'text') {
              let text = textNode.value;
              // Appliquer le formatage si nécessaire
              if (textNode.marks && textNode.marks.length > 0) {
                textNode.marks.forEach(mark => {
                  if (mark.type === 'bold') {
                    text = `<strong>${text}</strong>`;
                  } else if (mark.type === 'italic') {
                    text = `<em>${text}</em>`;
                  } else if (mark.type === 'underline') {
                    text = `<u>${text}</u>`;
                  }
                });
              }
              return text;
            }
            return textNode.value || '';
          }).join('')}</p>`;
        } else if (node.nodeType === 'heading-2') {
          return `<h2>${node.content.map(textNode => textNode.value).join('')}</h2>`;
        } else if (node.nodeType === 'heading-3') {
          return `<h3>${node.content.map(textNode => textNode.value).join('')}</h3>`;
        } else if (node.nodeType === 'unordered-list') {
          return `<ul>${node.content.map(listItem => {
            return `<li>${listItem.content.map(paragraph => {
              return paragraph.content.map(textNode => textNode.value).join('');
            }).join('')}</li>`;
          }).join('')}</ul>`;
        } else if (node.nodeType === 'ordered-list') {
          return `<ol>${node.content.map(listItem => {
            return `<li>${listItem.content.map(paragraph => {
              return paragraph.content.map(textNode => textNode.value).join('');
            }).join('')}</li>`;
          }).join('')}</ol>`;
        } else if (node.nodeType === 'embedded-asset-block') {
          // Gérer les images intégrées - à adapter selon votre structure
          return '<p><em>Image intégrée (non affichée)</em></p>';
        }
        
        // Par défaut, retourner un paragraphe vide
        return '<p></p>';
      }).join('');
    } else if (typeof content === 'string') {
      // Si vous utilisez le Markdown ou du contenu texte simple
      return content.split('\n').map(paragraph => `<p>${paragraph}</p>`).join('');
    }
    
    return '<p>Format de contenu non reconnu</p>';
  }
  
  // Initialiser les fonctions selon la page
  document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si nous sommes sur la page d'accueil
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
      loadArticlesPreview();
    }
    
    // Vérifier si nous sommes sur la page d'article
    const articleContainer = document.getElementById('article-container');
    if (articleContainer) {
      loadSingleArticle();
    }
    
    // Ajouter un event listener pour le menu mobile sur toutes les pages
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.toggle('open');
      });
    }
  });