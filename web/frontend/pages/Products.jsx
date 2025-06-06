import { useState, useEffect } from "react";
import { Page, Layout, Box, DataTable, Spinner, Banner, Modal, TextField, Text, Button, Thumbnail, Stack, Checkbox } from "@shopify/polaris";

const LoadingText = () => {
  return (
    <div style={{
      textAlign: "center",
      padding: "2rem",
      animation: "fadeInOut 1.5s infinite",
    }}>
      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0.3; }
            50% { opacity: 1; }
            100% { opacity: 0.3; }
          }
        `}
      </style>
      <Text variant="headingLg" as="h2">Fetching products...</Text>
    </div>
  );
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProducts, setEditingProducts] = useState([]);
  const [editTitles, setEditTitles] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [editedCount, setEditedCount] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (productId, checked) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, products.find(p => p.id === productId)]);
    } else {
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    }
  };

  const handleEdit = (product) => {
    if (selectedProducts.length > 0) {
      setEditingProducts(selectedProducts);
      const initialTitles = {};
      selectedProducts.forEach(p => {
        initialTitles[p.id] = p.title;
      });
      setEditTitles(initialTitles);
    } else {
      setEditingProducts([product]);
      setEditTitles({ [product.id]: product.title });
    }
  };

  const handleTitleChange = (productId, newTitle) => {
    setEditTitles(prev => {
      const updated = { ...prev, [productId]: newTitle };
      const changedCount = Object.entries(updated).filter(([id, title]) => 
        products.find(p => p.id === id)?.title !== title
      ).length;
      setEditedCount(changedCount);
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      const updatePromises = Object.entries(editTitles).map(([id, title]) => 
        fetch("/api/products/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            title,
          }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const results = await Promise.all(responses.map(r => r.json()));

      setProducts(products.map(p => {
        const updatedProduct = results.find(r => r.id === p.id);
        return updatedProduct ? { ...p, title: updatedProduct.title } : p;
      }));

      setEditingProducts([]);
      setSelectedProducts([]);
      setEditTitles({});
      setEditedCount(0);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDiscard = () => {
    setEditingProducts([]);
    setSelectedProducts([]);
    setEditTitles({});
    setEditedCount(0);
  };

  const rows = products.map((product) => [
    <Checkbox
      label=""
      checked={selectedProducts.some(p => p.id === product.id)}
      onChange={(checked) => handleCheckboxChange(product.id, checked)}
    />,
    <Thumbnail
      source={product.image || ""}
      alt={product.title}
      size="small"
    />,
    product.title,
    product.status,
    // `${product.priceRangeV2?.minVariantPrice?.amount || "N/A"} ${product.priceRangeV2?.minVariantPrice?.currencyCode || ""}`,
    <Button 
      variant="primary" 
      onClick={() => handleEdit(product)}
      disabled={selectedProducts.length > 0}
    >
      Edit
    </Button>,
  ]);

  const resourceName = {
    singular: 'product',
    plural: 'products',
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Box padding="4">
              <Stack vertical spacing="loose">
                <LoadingText />
                <div style={{ textAlign: "center" }}>
                  <Spinner accessibilityLabel="Loading products" size="large" />
                </div>
              </Stack>
            </Box>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Banner status="critical">
              <p>Error loading products: {error}</p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Box padding="4">
            <Stack vertical spacing="loose">
              <Stack distribution="equalSpacing">
                <Button
                  variant="primary"
                  onClick={() => handleEdit(selectedProducts[0])}
                  disabled={selectedProducts.length < 1}
                >
                  Edit Selected Products
                </Button>
                {editedCount > 0 && (
                  <p>Number of products edited: {editedCount}</p>
                )}
              </Stack>
              <DataTable
                resourceName={resourceName}
                itemCount={products.length}
                headings={[
                    <Text variant="headingMd">Select</Text>,
                    <Text variant="headingMd">Image</Text>,
                    <Text variant="headingMd">Title</Text>,
                    <Text variant="headingMd">Status</Text>,
                    <Text variant="headingMd">Actions</Text>,
                ]}
                rows={rows}
                columnContentTypes={[
                  "text",
                  "text",
                  "text",
                  "text",
                  "text",
                ]}
              />
            </Stack>
          </Box>
        </Layout.Section>
      </Layout>

      <Modal
        open={editingProducts.length > 0}
        onClose={handleDiscard}
        title={editingProducts.length > 1 ? "Edit Multiple Products" : "Edit Product"}
        primaryAction={{
          content: "Save",
          onAction: handleSave,
        }}
        secondaryActions={[
          {
            content: "Discard",
            onAction: handleDiscard,
          },
        ]}
      >
        <Modal.Section>
          <Stack vertical spacing="loose">
            {editingProducts.map((product) => (
              <TextField
                key={product.id}
                label={`Product: ${product.title}`}
                value={editTitles[product.id] || product.title}
                onChange={(value) => handleTitleChange(product.id, value)}
                autoComplete="off"
              />
            ))}
            {editedCount > 0 && (
              <p>Number of products edited: {editedCount}</p>
            )}
          </Stack>
        </Modal.Section>
      </Modal>
    </Page>
  );
} 