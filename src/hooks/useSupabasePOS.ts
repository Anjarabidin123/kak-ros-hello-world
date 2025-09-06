import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Product, CartItem, Receipt } from '@/types/pos';
import { toast } from 'sonner';

export const useSupabasePOS = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if supabase client is available
  if (!supabase) {
    console.error('Supabase client not available');
    return {
      products: [],
      cart: [],
      receipts: [],
      loading: false,
      addProduct: async () => {},
      updateProduct: async () => {},
      addToCart: () => {},
      updateCartQuantity: () => {},
      removeFromCart: () => {},
      clearCart: () => {},
      processTransaction: async () => null,
      formatPrice: (price: number) => new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(price),
    };
  }

  // Load products from database
  useEffect(() => {
    console.log('useSupabasePOS useEffect: Starting', { user: !!user, supabase: !!supabase });
    
    if (!user) {
      console.log('No user, setting loading to false');
      setLoading(false);
      return;
    }

    loadProducts();
    loadReceipts();

    // Temporarily disable real-time subscriptions to isolate the error
    console.log('Skipping real-time subscriptions for debugging');
    /*
    let productsSubscription: any;
    let receiptsSubscription: any;

    try {
      // Set up real-time subscriptions with error handling
      productsSubscription = supabase
        .channel('products_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'products' }, 
          () => {
            try {
              loadProducts();
            } catch (error) {
              console.error('Error in products subscription callback:', error);
            }
          }
        );

      receiptsSubscription = supabase
        .channel('receipts_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'receipts' }, 
          () => {
            try {
              loadReceipts();
            } catch (error) {
              console.error('Error in receipts subscription callback:', error);
            }
          }
        );

      // Only subscribe if channels were created successfully
      if (productsSubscription && typeof productsSubscription.subscribe === 'function') {
        productsSubscription.subscribe();
      }
      if (receiptsSubscription && typeof receiptsSubscription.subscribe === 'function') {
        receiptsSubscription.subscribe();
      }
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }

    return () => {
      try {
        if (productsSubscription && typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(productsSubscription);
        }
        if (receiptsSubscription && typeof supabase.removeChannel === 'function') {
          supabase.removeChannel(receiptsSubscription);
        }
      } catch (error) {
        console.error('Error cleaning up subscriptions:', error);
      }
    };
    */
  }, [user]);

  const loadProducts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedProducts: Product[] = data.map(item => ({
        id: item.id,
        name: item.name,
        costPrice: Number(item.cost_price),
        sellPrice: Number(item.sell_price),
        stock: item.stock,
        barcode: item.barcode,
        category: item.category,
        isPhotocopy: item.is_photocopy
      }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  const loadReceipts = async () => {
    if (!user) return;

    try {
      const { data: receiptsData, error } = await supabase
        .from('receipts')
        .select(`
          *,
          receipt_items (
            *,
            products (*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReceipts: Receipt[] = receiptsData.map(receipt => ({
        id: receipt.id,
        items: receipt.receipt_items.map((item: any) => ({
          product: {
            id: item.products.id,
            name: item.products.name,
            costPrice: Number(item.products.cost_price),
            sellPrice: Number(item.products.sell_price),
            stock: item.products.stock,
            barcode: item.products.barcode,
            category: item.products.category,
            isPhotocopy: item.products.is_photocopy
          },
          quantity: item.quantity,
          finalPrice: item.final_price ? Number(item.final_price) : undefined
        })),
        subtotal: Number(receipt.subtotal),
        discount: Number(receipt.discount),
        total: Number(receipt.total),
        profit: Number(receipt.profit),
        timestamp: new Date(receipt.created_at),
        paymentMethod: receipt.payment_method
      }));

      setReceipts(formattedReceipts);
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast.error('Gagal memuat riwayat transaksi');
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          cost_price: productData.costPrice,
          sell_price: productData.sellPrice,
          stock: productData.stock,
          barcode: productData.barcode,
          category: productData.category,
          is_photocopy: productData.isPhotocopy,
          user_id: user.id
        }]);

      if (error) throw error;
      toast.success('Produk berhasil ditambahkan');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Gagal menambahkan produk');
    }
  };

  const updateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.costPrice !== undefined) updateData.cost_price = updates.costPrice;
      if (updates.sellPrice !== undefined) updateData.sell_price = updates.sellPrice;
      if (updates.stock !== undefined) updateData.stock = updates.stock;
      if (updates.barcode !== undefined) updateData.barcode = updates.barcode;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.isPhotocopy !== undefined) updateData.is_photocopy = updates.isPhotocopy;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (error) throw error;
      toast.success('Produk berhasil diperbarui');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Gagal memperbarui produk');
    }
  };

  const processTransaction = async (cart: CartItem[], paymentMethod?: string, discount: number = 0, isManual: boolean = false): Promise<Receipt | null> => {
    if (!user || cart.length === 0) return null;

    try {
      const subtotal = cart.reduce((sum, item) => 
        sum + (item.finalPrice || item.product.sellPrice) * item.quantity, 0
      );
      const total = subtotal - discount;
      const profit = cart.reduce((sum, item) => 
        sum + ((item.finalPrice || item.product.sellPrice) - item.product.costPrice) * item.quantity, 0
      );

    // Generate invoice number using the new function
    const { data: invoiceData, error: invoiceError } = await supabase
      .rpc('generate_invoice_number', { is_manual: isManual });
    
    if (invoiceError) throw invoiceError;

      // Create receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          subtotal,
          discount,
          total,
          profit,
          payment_method: paymentMethod,
          receipt_number: invoiceData
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Create receipt items
      const receiptItems = cart.map(item => ({
        receipt_id: receiptData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        sell_price: item.product.sellPrice,
        cost_price: item.product.costPrice,
        final_price: item.finalPrice || item.product.sellPrice
      }));

      const { error: itemsError } = await supabase
        .from('receipt_items')
        .insert(receiptItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProduct(item.product.id, { stock: newStock });
      }

      const receipt: Receipt = {
        id: receiptData.id,
        items: cart,
        subtotal,
        discount,
        total,
        profit,
        timestamp: new Date(receiptData.created_at),
        paymentMethod
      };

      toast.success('Transaksi berhasil disimpan');
      return receipt;
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast.error('Gagal memproses transaksi');
      return null;
    }
  };

  const addToCart = (product: Product, quantity: number = 1, customPrice?: number) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + quantity, customPrice);
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        finalPrice: customPrice
      };
      setCart(prev => [...prev, newItem]);
    }
  };

  const updateCartQuantity = (productId: string, quantity: number, finalPrice?: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, quantity, finalPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const processTransactionWrapper = async (paymentMethod?: string, discount: number = 0, isManual: boolean = false): Promise<Receipt | null> => {
    const receipt = await processTransaction(cart, paymentMethod, discount, isManual);
    if (receipt) {
      clearCart();
    }
    return receipt;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return {
    products,
    cart,
    receipts,
    loading,
    addProduct,
    updateProduct,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  processTransaction: processTransactionWrapper,
    formatPrice,
  };
};