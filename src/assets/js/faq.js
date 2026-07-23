/**
 * FAQ Page Interactivity
 * Handles collapsible FAQ items with smooth animations
 */

class FAQHandler {
  static init() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length === 0) return;
    
    faqItems.forEach(item => {
      const questionElement = item.querySelector('.faq-question');
      
      if (questionElement) {
        questionElement.addEventListener('click', () => {
          FAQHandler.toggleItem(item, faqItems);
        });
      }
    });
  }
  
  static toggleItem(item, allItems) {
    const isActive = item.classList.contains('active');
    
    // Close all items
    allItems.forEach(faqItem => {
      faqItem.classList.remove('active');
    });
    
    // Open clicked item if it wasn't open
    if (!isActive) {
      item.classList.add('active');
    }
  }
}

// Initialize FAQ on page load
document.addEventListener('DOMContentLoaded', () => {
  FAQHandler.init();
});
