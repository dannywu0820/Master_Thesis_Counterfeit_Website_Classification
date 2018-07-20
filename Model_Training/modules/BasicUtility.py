import pandas as pd
import traceback
from sklearn.preprocessing import MinMaxScaler

class BasicUtility:
    #get dataframe from different formats
    @classmethod
    def readData(self_class, location):
        try:
            if location.endswith('.txt') or location.endswith('.csv'):
                return pd.read_csv(location)
            elif location.endswith('.xlsx'):
                return pd.read_excel(location)
            elif location.endswith('.json'):
                return pd.read_json(location, orient='records')
            else:
                raise TypeError
        except TypeError:
            print("[readData]: invalid file type")
        except:
            print("[readData]: other exceptions")
    
    #discard unwanted columns
    @classmethod
    def checkDataframe(self_class, dataframe):
        try:
            df_copy = dataframe.copy()
            columns_unused = ['url', 'hostname']
            
            for column in columns_unused:
                if column in df_copy.columns:
                    del df_copy[column]
                    
            return df_copy
            
        except:
            print("[checkDataframe]")
            traceback.print_exc()
    
    #split into label and feature dataframes
    @classmethod
    def splitLabelFeature(self_class, dataframe):
        try:
            df_copy = dataframe.copy()
            df_copy = self_class.checkDataframe(df_copy)
            
            if 'label' in df_copy.columns:
                label = df_copy['label']
                feature = df_copy.loc[:, df_copy.columns != 'label']
                
                return {'label': label, 'feature': feature}
            else:
                raise ValueError('\'label\' not in df_copy.columns')
            
        except:
            print("[splitLabelFeature]")
            traceback.print_exc()
    
    @classmethod
    def getMissingValueRate(self_class, dataframe, column_names):
        try:
            num_of_samples = dataframe.shape[0]
            amount_and_proportion = []
            for column_name in column_names:
                if 'dummy' not in column_name:
                    size = dataframe[column_name].value_counts().sum()
                    amount_of_missings = num_of_samples - size
                    proportion_of_missings = amount_of_missings * 100 / num_of_samples
                    amount_and_proportion.append( [amount_of_missings, proportion_of_missings] )
                else:
                    histogram = dataframe[column_name].value_counts()
                    amount_of_missings = num_of_samples - histogram[0]
                    proportion_of_missings = amount_of_missings * 100 / num_of_samples
                    amount_and_proportion.append( [amount_of_missings, proportion_of_missings] )
                    
            return pd.DataFrame(data=amount_and_proportion, index=column_names, columns=['Amount', 'Proportion(%)'])
                    
        except:
            print("[getMissingValueRate]")
            traceback.print_exc()
    
    @classmethod
    def getMissingRates(self_class, dataframe, column_names, is_dummy=False):
        try:
            if is_dummy:
                histogram = dataframe[column_names[0]].value_counts()
                size = histogram.sum()
                num_of_dummy = size-histogram[[0]].sum()
                missing_rate = num_of_dummy/size
                #print("missing rate of '%s': %d/%d(%f%%)" % (column_name, num_of_dummy, size, missing_rate))
                
                return missing_rate
            else:
                missings = []
                num_of_samples = dataframe.shape[0]
                for column_name in column_names:
                    size = dataframe[column_name].value_counts().sum()
                    num_of_missings = num_of_samples - size
                    missings.append([num_of_missings, num_of_missings * 100 / num_of_samples])
                    
                return pd.DataFrame(data=missings, index=column_names, columns=['Amount', 'Proportion(%)'])

        except:
            print("[getMissingRates]")
            traceback.print_exc()
    
    @classmethod
    #used only when missing value rate is low
    def fillMissingValues(self_class, dataframe, column_names, column_types):
        try:
            df_copy = dataframe.copy()
            fillin_values = {}

            for column_name, column_type in zip(column_names, column_types):
                if column_type == 'numerical':
                    fillin_values[column_name] = df_copy[column_name].apply('mean')
                elif column_type == 'categorical':
                    fillin_values[column_name] = 0

            df_copy = df_copy.fillna(value=fillin_values)

            return df_copy
        
        except:
            print("[fillMissingValues]")
            traceback.print_exc()
    
    @classmethod
    #in order to prevent clustering from being dominant by some large-range features
    def doFeatureScaling(self_class, dataframe):
        try:
            col_condition = (dataframe.columns != 'label') & (dataframe.columns != 'url') & (dataframe.columns != 'hostname')
            df_used = dataframe.loc[:, col_condition]
            df_unused = dataframe.loc[:, ~col_condition]
            
            scaler = MinMaxScaler()
            df_scaled = pd.DataFrame(scaler.fit_transform(df_used), columns=df_used.columns, index=df_used.index)
            df_scaled = pd.concat([df_unused, df_scaled], axis=1)
            
            return df_scaled
        
        except:
            print("[doFeatureScaling]")
            traceback.print_exc()