import traceback
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import MinMaxScaler
from BasicUtility import BasicUtility

class ClustererUtility:
    def __init__(self):
        self.a="haha"
    
    #in order to decide the best number of clusters K for filling missing values
    def chooseNumberOfClusters(self, dataframe_train, max_K=4):
        try:
            silhouette_scores = []
            best = {'num_of_clusters': -1, 'silhouette_avg': -2, 'clusterer': None, 'cluster_labels': None}
            X = dataframe_train.values.tolist()
            for num_of_clusters in range(2, max_K+1):
                clusterer = KMeans(n_clusters=num_of_clusters, random_state=0)
                cluster_labels = clusterer.fit_predict(X)
                silhouette_avg = silhouette_score(X, cluster_labels)
                silhouette_scores.append([num_of_clusters, silhouette_avg])
                if silhouette_avg > best['silhouette_avg']:
                    best['silhouette_avg'], best['num_of_clusters'], best['clusterer'], best['cluster_labels'] = silhouette_avg, num_of_clusters, clusterer, cluster_labels
            
            silhouette_scores = pd.DataFrame(data=silhouette_scores, columns=['K', 'Silhouette Score'])
            silhouette_scores = silhouette_scores.set_index('K')
            print(silhouette_scores)
                    
            return best
        
        except:
            print("[]")
            traceback.print_exc()
    
    #calculate filled-in values for each cluster
    def calculateValuesToFill(self, dataframe_with_cluster_label, columns_to_fill):
        try:
            gb_cluster = dataframe_with_cluster_label.groupby(['cluster_label'])
            cluster_size = gb_cluster.size()
            cluster_num_of_ones = gb_cluster.sum()
            
            df_result = pd.concat([cluster_size, cluster_num_of_ones], axis=1)
            new_columns = df_result.columns.values.tolist()
            new_columns[0] = 'cluster_size'
            df_result.columns = new_columns
            
            index = 2
            for column in columns_to_fill:
                df_result.insert(index, 'fill_'+column, df_result[column]/df_result['cluster_size'])
                index = index + 2
            print(df_result)
            
            return df_result
        
        except:
            print("[calculateValuesToFill]")
            traceback.print_exc()
    
    def fillMissingValue(self, dataframe_test, dataframe_values_to_fill, clusterer, columns_to_fill):
        try:
            X_test = dataframe_test.values.tolist()
            cluster_labels_test = clusterer.predict(X_test)
            cluster_labels_test = pd.DataFrame(data=cluster_labels_test, index=dataframe_test.index, columns=['cluster_label'])
            def replace(row):
                l = row['cluster_label']
                columns_to_get = ['fill_'+s for s in columns_to_fill]
                return dataframe_values_to_fill.loc[l, columns_to_get]
            
            cluster_labels_test[columns_to_fill] = cluster_labels_test.apply(replace, axis=1)
            return cluster_labels_test
            
        except:
            print("[fillMissingValue]")
            traceback.print_exc()
            
    
    def doDummyToClustering(self, dataframe, columns_to_fill=['under_a_year', 'china_registered'], max_K=4):
        try:
            df_kmeans = BasicUtility.checkDataframe(dataframe)
            
            col_condition = (df_kmeans.columns != 'label') & (df_kmeans.columns != 'under_a_year') & (df_kmeans.columns != 'under_a_year_dummy') & (df_kmeans.columns != 'china_registered') & (df_kmeans.columns != 'china_registered_dummy')
            row_condition = (df_kmeans['under_a_year_dummy'] != 1) & (df_kmeans['china_registered_dummy'] != 1)
            
            #do feature scaling
            df_kmeans_scaled = BasicUtility.doFeatureScaling(df_kmeans.loc[:, col_condition])
            df_kmeans_train = df_kmeans_scaled.loc[row_condition, :]
            df_kmeans_test = df_kmeans_scaled.loc[~row_condition, :]
            
            #choos K
            best = self.chooseNumberOfClusters(df_kmeans_train, max_K)
            
            #calculate fill-in values
            df_with_cluster_label = df_kmeans.loc[row_condition, columns_to_fill]
            df_with_cluster_label.insert(0, 'cluster_label', best['cluster_labels'])
            df_values_to_fill = self.calculateValuesToFill(df_with_cluster_label, columns_to_fill)
            
            #fill in missing values
            df_to_replace = self.fillMissingValue(df_kmeans_test, df_values_to_fill, best['clusterer'], columns_to_fill)
            df_kmeans.loc[df_kmeans_test.index, columns_to_fill] = df_to_replace.loc[df_kmeans_test.index, columns_to_fill]
            
            #drop dummy columns
            columns_to_drop = [s+"_dummy" for s in columns_to_fill]
            df_kmeans = df_kmeans.drop(columns=columns_to_drop)
            
            return df_kmeans #cluster_labels_test #df_values_to_fill
        
        except:
            print("[runExperiment]")
            traceback.print_exc()
            

class myClustererUtility:
    def __init__(self):
        self.result = None
    
    @classmethod
    def fillMissingValue(self, dataframe):
        df_kmeans = dataframe.copy()
        if 'url' in df_kmeans.columns:
            del df_kmeans["url"]
        if 'hostname' in df_kmeans.columns:
            del df_kmeans["hostname"]
        df_kmeans["under_a_year"] = df_kmeans["under_a_year"]+2*df_kmeans["under_a_year_dummy"]
        df_kmeans["china_registered"] = df_kmeans["china_registered"]+2*df_kmeans["china_registered_dummy"]
        df_kmeans = df_kmeans.drop(columns=["under_a_year_dummy", "china_registered_dummy"])
        
        col_condition = (df_kmeans.columns != "label") & (df_kmeans.columns != "under_a_year") & (df_kmeans.columns != "china_registered")
        row_condition = (df_kmeans["under_a_year"] != 2) & (df_kmeans["china_registered"] != 2)
        
        #feature scaling to range [0, 1]
        scaler = MinMaxScaler()
        df_kmeans_train = df_kmeans.loc[row_condition, col_condition]
        df_kmeans_train = pd.DataFrame(scaler.fit_transform(df_kmeans_train), columns=df_kmeans_train.columns, index=df_kmeans_train.index)
        df_kmeans_test = df_kmeans.loc[~row_condition, col_condition]
        df_kmeans_test = pd.DataFrame(scaler.fit_transform(df_kmeans_test), columns=df_kmeans_test.columns, index=df_kmeans_test.index)

        #calculate silhouette score in order to decide K
        silhouette_scores = []
        best_num_of_clusters = -1
        best_silhouette_avg = -2
        best_clusterer = None
        best_cluster_labels = None
        best = {'num_of_clusters': -1, 'silhouette_avg': -2, 'clusterer': None, 'cluster_labels': None}
        X = df_kmeans_train.values.tolist()
        for num_of_clusters in range(2, 5):
            clusterer = KMeans(n_clusters=num_of_clusters, random_state=0)
            cluster_labels = clusterer.fit_predict(X)
            silhouette_avg = silhouette_score(X, cluster_labels)
            silhouette_scores.append([num_of_clusters, silhouette_avg])
            if silhouette_avg > best['silhouette_avg']:
                best['silhouette_avg'], best['num_of_clusters'], best['clusterer'], best['cluster_labels'] = silhouette_avg, num_of_clusters, clusterer, cluster_labels
        silhouette_scores = pd.DataFrame(data=silhouette_scores, columns=['K', 'Silhouette Score'])
        silhouette_scores = silhouette_scores.set_index('K')
        print(silhouette_scores)

        #calculate fill-in value of whois-undefined variable in each cluster
        df_whois = df_kmeans.loc[row_condition, ~col_condition]
        df_whois = df_whois.drop(['label'], axis=1)
        df_whois.insert(0, 'cluster_label', best['cluster_labels'])
        cluster_num_of_ones = df_whois.groupby(['cluster_label']).sum()
        cluster_size = df_whois.groupby(['cluster_label']).size()
        cluster_num_of_ones.insert(0, 'cluster_size', cluster_size)
        cluster_num_of_ones.insert(2, 'fill_china_registered', cluster_num_of_ones['china_registered']/cluster_num_of_ones['cluster_size'])
        cluster_num_of_ones.insert(4, 'fill_under_a_year', cluster_num_of_ones['under_a_year']/cluster_num_of_ones['cluster_size'])
        print(cluster_num_of_ones)

        #replace 
        X_test = df_kmeans_test.values.tolist()
        cluster_labels_test = best['clusterer'].predict(X_test)
        cluster_labels_test = pd.Series(data=cluster_labels_test, index=df_kmeans_test.index)
        cluster_labels_train = pd.Series(data=best['cluster_labels'], index=df_kmeans_train.index)
        cluster_labels_all = pd.concat([cluster_labels_train, cluster_labels_test]).sort_index()
        df_kmeans['cluster_label'] = cluster_labels_all
        def replace_with(ori_value, label, field):
            if ori_value != 2:
                return ori_value
            else:
                return cluster_num_of_ones.loc[label, 'fill_'+field]
        df_kmeans['under_a_year'] = df_kmeans.apply(lambda row: replace_with(row['under_a_year'], row['cluster_label'], 'under_a_year'), axis=1)
        df_kmeans['china_registered'] = df_kmeans.apply(lambda row: replace_with(row['china_registered'], row['cluster_label'], 'china_registered'), axis=1)
        del df_kmeans['cluster_label']
        
        return df_kmeans