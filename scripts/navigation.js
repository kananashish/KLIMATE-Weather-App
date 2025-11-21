// Modern navigation functionality
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileSearch = document.querySelector('.mobile-search');
  
  if (mobileMenuToggle && mobileSearch) {
    mobileMenuToggle.addEventListener('click', function() {
      const isOpen = mobileSearch.style.display === 'block';
      mobileSearch.style.display = isOpen ? 'none' : 'block';
      
      // Animate hamburger icon
      mobileMenuToggle.classList.toggle('active');
    });
  }

  // Sync search between desktop and mobile
  const searchCity = document.getElementById('searchCity');
  const mobileSearchCity = document.getElementById('mobileSearchCity');
  
  if (searchCity && mobileSearchCity) {
    searchCity.addEventListener('input', function() {
      mobileSearchCity.value = this.value;
    });
    
    mobileSearchCity.addEventListener('input', function() {
      searchCity.value = this.value;
    });
  }

  // Header scroll effect
  let lastScroll = 0;
  const header = document.querySelector('.header');
  
  window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
      header.style.boxShadow = 'none';
    } else {
      header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
    }
    
    lastScroll = currentScroll;
  });

  // Add smooth fade-in animation to elements
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observe stat cards and forecast cards
  document.querySelectorAll('.stat-card, .daily-forecast-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });
});
