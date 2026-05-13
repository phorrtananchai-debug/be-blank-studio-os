import { useEffect, useState } from 'react';
import { initialPortfolioItems } from '../data/seed.js';
import { addCollectionItem, isFirebaseConfigured, subscribeToCollection, updateCollectionItem } from '../services/firebase.js';

const portfolioCollection = 'portfolioItems';

export function usePortfolioItems({ seedWhenEmpty = false, enabled = true } = {}) {
  const [portfolioItems, setPortfolioItems] = useState(initialPortfolioItems);

  useEffect(() => {
    if (!enabled || !isFirebaseConfigured()) {
      setPortfolioItems(initialPortfolioItems);
      return undefined;
    }

    let didSeedPortfolio = false;

    try {
      return subscribeToCollection(
        portfolioCollection,
        async (items) => {
          if (seedWhenEmpty && !items.length && !didSeedPortfolio) {
            didSeedPortfolio = true;
            await Promise.all(initialPortfolioItems.map((item) => addCollectionItem(portfolioCollection, item)));
            return;
          }

          setPortfolioItems(items.length ? items : initialPortfolioItems);
        },
        () => setPortfolioItems(initialPortfolioItems),
      );
    } catch {
      setPortfolioItems(initialPortfolioItems);
      return undefined;
    }
  }, [enabled, seedWhenEmpty]);

  const updatePortfolioItem = async (id, updates) => {
    setPortfolioItems((items) => items.map((item) => (item.id === id ? { ...item, ...updates } : item)));

    if (isFirebaseConfigured()) {
      await updateCollectionItem(portfolioCollection, id, updates);
    }

    return { id, ...updates };
  };

  return { portfolioItems, setPortfolioItems, updatePortfolioItem };
}
